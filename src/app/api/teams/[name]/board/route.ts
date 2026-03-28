import { NextRequest, NextResponse } from "next/server";
import { boardShow } from "@/lib/clawteam";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/teams/[name]/board - Get board snapshot
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const snapshot = await boardShow(name);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET /api/teams/[name]/board error:", error);
    const message = error instanceof Error ? error.message : "Failed to get board snapshot";
    
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
