import { NextResponse } from "next/server";
import { getAgents, updateAgentStatus } from "@/lib/store";
import { processManager } from "@/lib/process-manager";

// 停止间隔（毫秒），防止同时停止导致请求量过大
const STOP_INTERVAL_MS = 500;

export async function POST() {
  try {
    const agents = getAgents();
    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const agent of agents) {
      try {
        if (!processManager.isRunning(agent.name)) {
          results.push({ name: agent.name, success: true, error: "not_running" });
          continue;
        }

        await processManager.stopGateway(agent.name);
        updateAgentStatus(agent.name, "stopped");
        results.push({ name: agent.name, success: true });

        // 停止间隔，防止并发过大
        if (STOP_INTERVAL_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, STOP_INTERVAL_MS));
        }
      } catch (error) {
        results.push({
          name: agent.name,
          success: false,
          error: error instanceof Error ? error.message : "Failed to stop",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: agents.length,
      results,
    });
  } catch (error) {
    console.error("POST /api/agents/stop-all error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop all agents" },
      { status: 500 }
    );
  }
}