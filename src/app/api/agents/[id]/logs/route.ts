import { NextRequest } from "next/server";
import { getAgent } from "@/lib/store";
import { processManager } from "@/lib/process-manager";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: name } = await params;
  const agent = getAgent(name);

  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 使用 agent.name 作为进程管理的 key
      const buffer = processManager.getLogBuffer(agent.name);
      for (const log of buffer) {
        const data = `data: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // 使用 agent.name 订阅日志
      const unsubscribe = processManager.subscribeToLogs(agent.name, (log) => {
        try {
          const data = `data: ${JSON.stringify(log)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          unsubscribe();
        }
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
