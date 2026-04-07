import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/store";
import fs from "fs";
import path from "path";
import os from "os";

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

interface Attachment {
  name: string;
  type: string;
  preview?: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "bot" | "tool";
  content: string;
  timestamp: string;
  thinkContent?: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
  attachments?: Attachment[];
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
          let textContent = "";
          let msgAttachments: Attachment[] | undefined;

          // 处理多模态格式（content 为数组）
          if (Array.isArray(record.content)) {
            const textParts: string[] = [];
            const imageAttachments: Attachment[] = [];

            for (const part of record.content) {
              if (part.type === "text" && part.text) {
                // 检查是否是图片引用格式: [image: /path/to/file]
                const imageMatch = part.text.match(/^\[image:\s*(.+?)\]$/);
                if (imageMatch) {
                  const localPath = imageMatch[1];
                  let preview: string | undefined;
                  let mimeType = "image/png";

                  try {
                    if (fs.existsSync(localPath)) {
                      const fileName = path.basename(localPath);
                      const uploadsDir = path.join(os.homedir(), ".nanocats-manager", "uploads", name);
                      if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                      }
                      const destPath = path.join(uploadsDir, fileName);
                      // 只在目标不存在时复制（避免重复）
                      if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(localPath, destPath);
                      }
                      preview = `/api/agents/${name}/media?file=${fileName}`;

                      // 从文件扩展名推断 MIME 类型
                      const ext = path.extname(localPath).toLowerCase();
                      const mimeMap: Record<string, string> = {
                        ".png": "image/png",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".gif": "image/gif",
                        ".webp": "image/webp",
                      };
                      mimeType = mimeMap[ext] || "image/png";
                    }
                  } catch (e) {
                    console.error("Failed to copy media file:", e);
                  }

                  imageAttachments.push({
                    name: path.basename(localPath),
                    type: mimeType,
                    preview,
                  });
                } else {
                  // 普通文本，但也可能包含内嵌的 [image: ...] 引用
                  // 用正则替换掉所有 [image: ...] 引用
                  let cleanText = part.text.replace(/\[image:\s*.+?\]/g, "").trim();
                  if (cleanText) {
                    textParts.push(cleanText);
                  }
                }
              } else if (part.type === "image_url" && part.image_url?.url) {
                // 也保留对 image_url 格式的支持（以防将来 nanobot 改格式）
                const url = part.image_url.url;
                let preview: string | undefined;
                let mimeType = "image/png";

                if (url.startsWith("data:")) {
                  // base64 data URL，直接可用
                  preview = url;
                  const match = url.match(/data:([^;]+);/);
                  if (match) mimeType = match[1];
                } else {
                  // 本地文件路径，复制到用户数据目录并生成 URL
                  const localPath = url.startsWith("file://") ? url.slice(7) : url;
                  try {
                    if (fs.existsSync(localPath)) {
                      const fileName = path.basename(localPath);
                      const uploadsDir = path.join(os.homedir(), ".nanocats-manager", "uploads", name);
                      if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                      }
                      const destPath = path.join(uploadsDir, fileName);
                      // 只在目标不存在时复制（避免重复）
                      if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(localPath, destPath);
                      }
                      preview = `/api/agents/${name}/media?file=${fileName}`;

                      // 从文件扩展名推断 MIME 类型
                      const ext = path.extname(localPath).toLowerCase();
                      const mimeMap: Record<string, string> = {
                        ".png": "image/png",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".gif": "image/gif",
                        ".webp": "image/webp",
                      };
                      mimeType = mimeMap[ext] || "image/png";
                    }
                  } catch (e) {
                    console.error("Failed to copy media file:", e);
                  }
                }

                imageAttachments.push({
                  name: path.basename(url),
                  type: mimeType,
                  preview,
                });
              }
            }

            textContent = textParts.join("\n");
            if (imageAttachments.length > 0) {
              msgAttachments = imageAttachments;
            }
          } else {
            // content 是字符串，处理可能包含的 [image: ...] 引用
            const contentStr = typeof record.content === "string" ? record.content : String(record.content || "");
            const imageRegex = /\[image:\s*(.+?)\]/g;
            const imageAttachments: Attachment[] = [];
            let match;

            while ((match = imageRegex.exec(contentStr)) !== null) {
              const localPath = match[1];
              let preview: string | undefined;
              let mimeType = "image/png";

              try {
                if (fs.existsSync(localPath)) {
                  const fileName = path.basename(localPath);
                  const uploadsDir = path.join(os.homedir(), ".nanocats-manager", "uploads", name);
                  if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                  }
                  const destPath = path.join(uploadsDir, fileName);
                  // 只在目标不存在时复制（避免重复）
                  if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(localPath, destPath);
                  }
                  preview = `/api/agents/${name}/media?file=${fileName}`;

                  // 从文件扩展名推断 MIME 类型
                  const ext = path.extname(localPath).toLowerCase();
                  const mimeMap: Record<string, string> = {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".gif": "image/gif",
                    ".webp": "image/webp",
                  };
                  mimeType = mimeMap[ext] || "image/png";
                }
              } catch (e) {
                console.error("Failed to copy media file:", e);
              }

              imageAttachments.push({
                name: path.basename(localPath),
                type: mimeType,
                preview,
              });
            }

            // 移除所有 [image: ...] 引用，保留纯文本
            textContent = contentStr.replace(/\[image:\s*.+?\]/g, "").trim();
            if (imageAttachments.length > 0) {
              msgAttachments = imageAttachments;
            }
          }

          messages.push({
            id: `msg_${timestamp}_user`,
            type: "user",
            content: textContent,
            timestamp,
            attachments: msgAttachments,
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
