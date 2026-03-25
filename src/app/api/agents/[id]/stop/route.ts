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

    await processManager.stopGateway(id);
    updateAgentStatus(id, "stopped");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/agents/[id]/stop error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop agent" },
      { status: 500 }
    );
  }
}
