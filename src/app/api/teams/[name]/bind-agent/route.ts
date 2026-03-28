import { NextRequest, NextResponse } from "next/server";
import { addMemberToTeam, removeMemberFromTeam } from "@/lib/clawteam";
import { getAgent, addAgentTeamBinding, removeAgentTeamBinding } from "@/lib/store";

interface RouteParams {
  params: Promise<{ name: string }>;
}

interface BindAgentRequest {
  agentId: string;
}

/**
 * POST /api/teams/[name]/bind-agent - Bind an agent to a team
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name: teamName } = await params;
    const body: BindAgentRequest = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // Get agent instance
    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Add member to team via ClawTeam (使用 agent.name 作为 agentId)
    await addMemberToTeam(teamName, agent.name, agent.name);

    // Update store with team binding (使用 agent.name 作为主键)
    await addAgentTeamBinding(agent.name, teamName, agent.name);

    return NextResponse.json({
      success: true,
      memberName: agent.name,
    });
  } catch (error) {
    console.error("POST /api/teams/[name]/bind-agent error:", error);
    const message = error instanceof Error ? error.message : "Failed to bind agent to team";

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

/**
 * DELETE /api/teams/[name]/bind-agent - Unbind an agent from a team
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name: teamName } = await params;
    const body: BindAgentRequest = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // Get agent instance
    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Remove member from team via ClawTeam
    await removeMemberFromTeam(teamName, agent.name);

    // Update store to remove team binding (使用 agent.name 作为主键)
    await removeAgentTeamBinding(agent.name, teamName);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE /api/teams/[name]/bind-agent error:", error);
    const message = error instanceof Error ? error.message : "Failed to unbind agent from team";

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
