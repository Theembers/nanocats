import { NextRequest, NextResponse } from "next/server";
import { showTeam, spawnAgent, killAgent } from "@/lib/clawteam";
import type { SpawnAgentInput } from "@/lib/types";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/teams/[name]/agents - List team members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const team = await showTeam(name);
    return NextResponse.json(team.agents);
  } catch (error) {
    console.error("GET /api/teams/[name]/agents error:", error);
    const message = error instanceof Error ? error.message : "Failed to list team agents";
    
    if (message.includes("not found") || message.includes("不存在")) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[name]/agents - Spawn a new agent in the team
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { agentName, task } = body;

    if (!agentName || typeof agentName !== "string") {
      return NextResponse.json(
        { error: "agentName is required" },
        { status: 400 }
      );
    }

    const input: SpawnAgentInput = {
      teamName: name,
      agentName,
      task,
    };

    await spawnAgent(input);

    return NextResponse.json({ success: true, agentName }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams/[name]/agents error:", error);
    const message = error instanceof Error ? error.message : "Failed to spawn agent";
    
    if (message.includes("not found") || message.includes("不存在")) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/[name]/agents - Kill an agent in the team
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { agentName } = body;

    if (!agentName || typeof agentName !== "string") {
      return NextResponse.json(
        { error: "agentName is required in body" },
        { status: 400 }
      );
    }

    await killAgent(name, agentName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/teams/[name]/agents error:", error);
    const message = error instanceof Error ? error.message : "Failed to kill agent";
    
    if (message.includes("not found") || message.includes("不存在")) {
      return NextResponse.json(
        { error: "Team or agent not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
