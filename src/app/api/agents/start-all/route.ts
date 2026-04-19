import { NextResponse } from "next/server";
import { getAgents, updateAgentStatus } from "@/lib/store";
import { processManager } from "@/lib/process-manager";

// 启动间隔（毫秒），防止同时启动导致请求量过大
const START_INTERVAL_MS = 1000;

export async function POST() {
  try {
    const agents = getAgents();
    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const agent of agents) {
      try {
        if (processManager.isRunning(agent.name)) {
          results.push({ name: agent.name, success: true, error: "already_running" });
          continue;
        }

        const pid = await processManager.startGateway(agent);
        updateAgentStatus(agent.name, "running", pid);
        results.push({ name: agent.name, success: true });

        // 启动间隔，防止并发过大
        if (START_INTERVAL_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, START_INTERVAL_MS));
        }
      } catch (error) {
        results.push({
          name: agent.name,
          success: false,
          error: error instanceof Error ? error.message : "Failed to start",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: agents.length,
      results,
    });
  } catch (error) {
    console.error("POST /api/agents/start-all error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start all agents" },
      { status: 500 }
    );
  }
}