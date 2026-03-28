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
    await processManager.stopGateway(agent.name);
    // 使用 agent.name 更新状态
    updateAgentStatus(agent.name, "stopped");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/agents/[id]/stop error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop agent" },
      { status: 500 }
    );
  }
}
