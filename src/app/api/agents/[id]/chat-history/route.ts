import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/store";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface ToolResult {
  toolCallId: string;
  name: string;
  content: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "bot" | "tool";
  content: string;
  timestamp: string;
  thinkContent?: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
}

/**
 * 解析 content 中的 <think>...</think> 块
 */
function parseThinkContent(content: string): { think: string | null; rest: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const think = thinkMatch[1].trim();
    const rest = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    return { think, rest };
  }
  return { think: null, rest: content };
}

/**
 * 读取 agent 的 webchat 历史会话记录
 * 从 workspace/sessions/webchat_webchat_{agentName}.jsonl 读取
 * 使用 agent.name 作为 session 文件标识
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 构造 session 文件路径
    // 使用 URL 中的 name 作为 session 文件标识（与 WebSocket session_id 保持一致）
    // 文件名格式: webchat_webchat_web_{name}.jsonl
    const sessionFileName = `webchat_webchat_web_${name}.jsonl`;
    const sessionFilePath = path.join(
      agent.workspacePath,
      "workspace",
      "sessions",
      sessionFileName
    );

    // 如果文件不存在，返回空数组
    if (!fs.existsSync(sessionFilePath)) {
      return NextResponse.json({ messages: [] });
    }

    // 读取并解析 JSONL 文件
    const content = fs.readFileSync(sessionFilePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const messages: ChatMessage[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        // 跳过 metadata 行
        if (record._type === "metadata") continue;

        const timestamp = record.timestamp || new Date().toISOString();

        // 处理 user 消息
        if (record.role === "user") {
          messages.push({
            id: `msg_${timestamp}_user`,
            type: "user",
            content: record.content || "",
            timestamp,
          });
        }
        // 处理 assistant 消息
        else if (record.role === "assistant") {
          const { think, rest } = parseThinkContent(record.content || "");
          
          // 解析 tool_calls
          const toolCalls: ToolCall[] = [];
          if (record.tool_calls && Array.isArray(record.tool_calls)) {
            for (const tc of record.tool_calls) {
              toolCalls.push({
                id: tc.id || "",
                name: tc.function?.name || "unknown",
                arguments: tc.function?.arguments || "{}",
              });
            }
          }

          messages.push({
            id: `msg_${timestamp}_bot`,
            type: "bot",
            content: rest,
            timestamp,
            thinkContent: think || undefined,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          });
        }
        // 处理 tool 结果消息
        else if (record.role === "tool") {
          messages.push({
            id: `msg_${timestamp}_tool_${record.tool_call_id}`,
            type: "tool",
            content: "",
            timestamp,
            toolResult: {
              toolCallId: record.tool_call_id || "",
              name: record.name || "unknown",
              content: record.content || "",
            },
          });
        }
      } catch (e) {
        // 忽略解析失败的行
        console.warn("Failed to parse chat history line:", e);
      }
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/agents/[id]/chat-history error:", error);
    return NextResponse.json(
      { error: "Failed to read chat history" },
      { status: 500 }
    );
  }
}
