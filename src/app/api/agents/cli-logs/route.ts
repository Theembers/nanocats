import { NextResponse } from "next/server";
import { getCliLogs } from "@/lib/process-manager";

export async function GET() {
  try {
    const logs = getCliLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/agents/cli-logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch CLI logs" },
      { status: 500 }
    );
  }
}
