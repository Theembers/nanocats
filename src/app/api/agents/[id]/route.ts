import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgent, deleteAgent } from "@/lib/store";
import { processManager } from "@/lib/process-manager";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id] - Get single agent details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    const isRunning = processManager.isRunning(agent.id);
    const agentWithStatus = {
      ...agent,
      status: isRunning ? "running" : "stopped",
    };

    return NextResponse.json(agentWithStatus);
  } catch (error) {
    console.error("GET /api/agents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to get agent" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id] - Update agent metadata
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, port } = body;

    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    const updates: { name?: string; port?: number } = {};
    if (name !== undefined) updates.name = name;
    if (port !== undefined) updates.port = port;

    const updatedAgent = updateAgent(id, updates);

    if (!updatedAgent) {
      return NextResponse.json(
        { error: "Failed to update agent" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error("PUT /api/agents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id] - Delete agent
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Stop the process if running
    if (processManager.isRunning(id)) {
      await processManager.stopGateway(id);
    }

    // Remove from store (but don't delete filesystem files)
    const deleted = deleteAgent(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
