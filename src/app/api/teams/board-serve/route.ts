import { NextRequest, NextResponse } from "next/server";
import { startBoardServe, stopBoardServe, getBoardServeStatus } from "@/lib/clawteam";

/**
 * GET /api/teams/board-serve - Get WebUI status
 */
export async function GET() {
  try {
    const status = getBoardServeStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/teams/board-serve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get board serve status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/board-serve - Start or stop the board serve WebUI
 * Body: { action: "start" | "stop", port?: number, host?: string, team?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, port, host, team } = body;

    if (!action || (action !== "start" && action !== "stop")) {
      return NextResponse.json(
        { error: "action must be 'start' or 'stop'" },
        { status: 400 }
      );
    }

    if (action === "start") {
      if (port !== undefined && typeof port !== "number") {
        return NextResponse.json({ error: "port must be a number" }, { status: 400 });
      }
      if (host !== undefined && typeof host !== "string") {
        return NextResponse.json({ error: "host must be a string" }, { status: 400 });
      }
      if (team !== undefined && typeof team !== "string") {
        return NextResponse.json({ error: "team must be a string" }, { status: 400 });
      }
      const status = await startBoardServe({ port, host, team });
      return NextResponse.json(status, { status: 201 });
    } else {
      await stopBoardServe();
      return NextResponse.json({ success: true, running: false });
    }
  } catch (error) {
    console.error("POST /api/teams/board-serve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to control board serve" },
      { status: 500 }
    );
  }
}
