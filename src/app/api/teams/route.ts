import { NextRequest, NextResponse } from "next/server";
import { listTeams, createTeam } from "@/lib/clawteam";
import type { CreateTeamInput } from "@/lib/types";

/**
 * GET /api/teams - List all teams
 */
export async function GET() {
  try {
    const teams = await listTeams();
    return NextResponse.json(teams);
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list teams" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams - Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, leaderName } = body as CreateTeamInput;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    if (!leaderName || typeof leaderName !== "string") {
      return NextResponse.json(
        { error: "leaderName is required" },
        { status: 400 }
      );
    }

    await createTeam({ name, description, leaderName });

    return NextResponse.json({ success: true, name }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create team" },
      { status: 500 }
    );
  }
}
