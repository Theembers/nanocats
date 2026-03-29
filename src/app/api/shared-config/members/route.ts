import { NextResponse } from "next/server";
import { getSharedConfigAgents, getManagerAgent } from "@/lib/store";
import type { AgentInstance } from "@/lib/types";

/**
 * GET /api/shared-config/members - 获取所有成员 agent（manager + member）
 */
export async function GET() {
  try {
    const agents = getSharedConfigAgents();
    const manager = getManagerAgent();

    return NextResponse.json({
      members: agents.map((agent) => ({
        name: agent.name,
        status: agent.status,
        role: agent.role,
      })),
      manager: manager
        ? {
            name: manager.name,
            status: manager.status,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/shared-config/members error:", error);
    return NextResponse.json(
      { error: "Failed to get members" },
      { status: 500 }
    );
  }
}
