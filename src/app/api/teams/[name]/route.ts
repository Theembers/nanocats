import { NextRequest, NextResponse } from "next/server";
import { showTeam, deleteTeam } from "@/lib/clawteam";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/teams/[name] - Get team details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const team = await showTeam(name);
    return NextResponse.json(team);
  } catch (error) {
    console.error("GET /api/teams/[name] error:", error);
    const message = error instanceof Error ? error.message : "Failed to get team";
    
    // Check if team not found
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
 * DELETE /api/teams/[name] - Delete a team
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    await deleteTeam(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/teams/[name] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete team";
    
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
