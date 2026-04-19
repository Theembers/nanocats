import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAgentUploadsDir } from "@/lib/config";

function getMediaDir(agentId: string): string {
  const dir = getAgentUploadsDir(agentId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// POST: 上传文件（接收 base64）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    // body: { files: [{ data: "data:image/png;base64,...", filename: "xxx.png" }] }

    const mediaDir = getMediaDir(id);
    const savedFiles: { filename: string; url: string }[] = [];

    for (const file of body.files || []) {
      const { data, filename } = file;
      if (!data || !filename) continue;

      // 解码 base64
      let base64Data = data;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      const buffer = Buffer.from(base64Data, "base64");

      // 限制 10MB
      if (buffer.length > 10 * 1024 * 1024) continue;

      // 生成唯一文件名
      const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${filename}`;
      const filePath = path.join(mediaDir, uniqueName);

      fs.writeFileSync(filePath, buffer);

      savedFiles.push({
        filename: uniqueName,
        url: `/api/agents/${id}/media?file=${uniqueName}`,
      });
    }

    return NextResponse.json({ files: savedFiles });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET: 服务文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filename = request.nextUrl.searchParams.get("file");
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  // 安全检查：防止路径遍历
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const mediaDir = getMediaDir(id);
  const filePath = path.join(mediaDir, filename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".zip": "application/zip",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  const contentType = mimeMap[ext] || "application/octet-stream";

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
