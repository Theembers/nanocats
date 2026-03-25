import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/store";
import fs from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!fs.existsSync(agent.configPath)) {
      return NextResponse.json(
        { error: "Config file not found" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(agent.configPath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    console.error("GET /api/agents/[id]/config error:", error);
    return NextResponse.json(
      { error: "Failed to read config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    try {
      JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON content" },
        { status: 400 }
      );
    }

    fs.writeFileSync(agent.configPath, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/agents/[id]/config error:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
