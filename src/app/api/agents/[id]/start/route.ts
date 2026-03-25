import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgentStatus } from "@/lib/store";
import { processManager } from "@/lib/process-manager";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (processManager.isRunning(id)) {
      return NextResponse.json(
        { error: "Agent is already running" },
        { status: 400 }
      );
    }

    const pid = await processManager.startGateway(agent);
    updateAgentStatus(id, "running", pid);

    return NextResponse.json({ success: true, pid });
  } catch (error) {
    console.error("POST /api/agents/[id]/start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start agent" },
      { status: 500 }
    );
  }
}
