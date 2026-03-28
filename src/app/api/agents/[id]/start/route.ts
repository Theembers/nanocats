import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgentStatus } from "@/lib/store";
import { processManager } from "@/lib/process-manager";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 使用 agent.name 作为进程管理的 key
    if (processManager.isRunning(agent.name)) {
      return NextResponse.json(
        { error: "Agent is already running" },
        { status: 400 }
      );
    }

    const pid = await processManager.startGateway(agent);
    // 使用 agent.name 更新状态
    updateAgentStatus(agent.name, "running", pid);

    return NextResponse.json({ success: true, pid });
  } catch (error) {
    console.error("POST /api/agents/[id]/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start agent" },
      { status: 500 }
    );
  }
}
