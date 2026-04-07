import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/store";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SessionRecord {
  _type?: string;
  role?: string;
  content?: string;
  timestamp?: string;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
  [key: string]: unknown;
}

interface SessionFile {
  filename: string;
  createdAt: string;
  records: SessionRecord[];
}

/**
 * 读取 agent 的 cron session 记录
 * 从 workspace/sessions/cron_*.jsonl 读取
 * 返回每个文件的独立内容，不合并
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 构造 session 目录路径
    const sessionsDir = path.join(agent.workspacePath, "sessions");

    // 如果目录不存在，返回空数组
    if (!fs.existsSync(sessionsDir)) {
      return NextResponse.json({ files: [] });
    }

    // 扫描 cron_*.jsonl 文件
    const files = fs.readdirSync(sessionsDir);
    const cronFiles = files
      .filter(f => f.startsWith("cron_") && f.endsWith(".jsonl"))
      .map(f => ({ name: f, path: path.join(sessionsDir, f) }));

    if (cronFiles.length === 0) {
      return NextResponse.json({ files: [] });
    }

    // 按文件修改时间排序（最新的在前）
    cronFiles.sort((a, b) => {
      const statA = fs.statSync(a.path);
      const statB = fs.statSync(b.path);
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

    // 只取最新的 10 个文件
    const filesToRead = cronFiles.slice(0, 10);
    const result: SessionFile[] = [];

    for (const { name: filename, path: filePath } of filesToRead) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.trim().split("\n").filter(Boolean);
        const records: SessionRecord[] = [];

        for (const line of lines) {
          try {
            const record = JSON.parse(line) as SessionRecord;
            // 跳过 metadata 行
            if (record._type === "metadata") continue;
            records.push(record);
          } catch (e) {
            // 忽略解析失败的行
            console.warn("Failed to parse line:", e);
          }
        }

        if (records.length > 0) {
          const stat = fs.statSync(filePath);
          result.push({ filename, createdAt: stat.mtime.toISOString(), records });
        }
      } catch (e) {
        console.warn("Failed to read file:", filePath, e);
      }
    }

    return NextResponse.json({ files: result });
  } catch (error) {
    console.error("GET /api/agents/[id]/cron/core-logs error:", error);
    return NextResponse.json(
      { error: "Failed to read cron session logs" },
      { status: 500 }
    );
  }
}
