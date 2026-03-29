import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgent, deleteAgent, updateAgentRole } from "@/lib/store";
import { processManager } from "@/lib/process-manager";
import fs from "fs";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id] - Get single agent details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // 使用 agent.name 作为进程管理的 key
    const isRunning = processManager.isRunning(agent.name);
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
    const { id: name } = await params;
    const body = await request.json();
    const { name: newName, port, role } = body;

    const agent = getAgent(name);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // 如果更新了 role，使用专门的 role 更新方法
    if (role !== undefined) {
      if (role !== "manager" && role !== "member") {
        return NextResponse.json(
          { error: "Invalid role. Must be 'manager' or 'member'" },
          { status: 400 }
        );
      }

      const updatedAgent = updateAgentRole(name, role);
      if (!updatedAgent) {
        return NextResponse.json(
          { error: "Failed to update agent role" },
          { status: 500 }
        );
      }
      return NextResponse.json(updatedAgent);
    }

    // 其他字段更新
    const updates: { name?: string; port?: number } = {};
    if (newName !== undefined) updates.name = newName;
    if (port !== undefined) updates.port = port;

    const updatedAgent = updateAgent(name, updates);

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
    const { id: name } = await params;

    const agent = getAgent(name);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Stop the process if running
    // 使用 agent.name 停止进程
    if (processManager.isRunning(agent.name)) {
      await processManager.stopGateway(agent.name);
    }

    // Delete the agent workspace directory from filesystem
    try {
      if (fs.existsSync(agent.workspacePath)) {
        fs.rmSync(agent.workspacePath, { recursive: true, force: true });
      }
    } catch (fsError) {
      console.error("Failed to delete agent workspace:", fsError);
      return NextResponse.json(
        { error: "Failed to delete agent workspace files" },
        { status: 500 }
      );
    }

    // Remove from store
    const deleted = deleteAgent(name);

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
