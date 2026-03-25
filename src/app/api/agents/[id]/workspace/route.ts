import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/store";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]/workspace?path=xxx - 获取 workspace 文件内容
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "path parameter is required" },
        { status: 400 }
      );
    }

    // 确保路径在 workspace 目录内，防止目录遍历攻击
    const fullPath = path.resolve(path.join(agent.workspacePath, filePath));
    const resolvedWorkspace = path.resolve(agent.workspacePath);
    
    if (!fullPath.startsWith(resolvedWorkspace)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    console.error("GET /api/agents/[id]/workspace error:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id]/workspace?path=xxx - 保存 workspace 文件内容
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "path parameter is required" },
        { status: 400 }
      );
    }

    // 确保路径在 workspace 目录内
    const fullPath = path.resolve(path.join(agent.workspacePath, filePath));
    const resolvedWorkspace = path.resolve(agent.workspacePath);
    
    if (!fullPath.startsWith(resolvedWorkspace)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (content === undefined || content === null) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/agents/[id]/workspace error:", error);
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]/workspace?path=xxx - 删除 workspace 文件
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "path parameter is required" },
        { status: 400 }
      );
    }

    // 确保路径在 workspace 目录内
    const fullPath = path.resolve(path.join(agent.workspacePath, filePath));
    const resolvedWorkspace = path.resolve(agent.workspacePath);
    
    if (!fullPath.startsWith(resolvedWorkspace)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    fs.unlinkSync(fullPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agents/[id]/workspace error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
