import { NextRequest, NextResponse } from "next/server";
import { getAgent, getAgentEnvContent, setAgentEnvContent } from "@/lib/store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const content = getAgentEnvContent(name);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("GET /api/agents/[id]/env error:", error);
    return NextResponse.json(
      { error: "Failed to read env file" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: name } = await params;
    const agent = getAgent(name);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    // 验证 .env 格式（可选的简单验证）
    // 允许注释、空行和 KEY=VALUE 格式
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 跳过空行和注释
      if (!line || line.startsWith("#")) {
        continue;
      }
      // 验证 KEY=VALUE 格式
      if (!line.includes("=")) {
        return NextResponse.json(
          { error: `Invalid .env format at line ${i + 1}: missing '=' separator` },
          { status: 400 }
        );
      }
    }

    const success = setAgentEnvContent(name, content);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to write env file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/agents/[id]/env error:", error);
    return NextResponse.json(
      { error: "Failed to update env file" },
      { status: 500 }
    );
  }
}
