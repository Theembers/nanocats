import { NextRequest, NextResponse } from "next/server";
import { peekMessages, sendMessage } from "@/lib/clawteam";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/teams/[name]/inbox - Peek messages for a team
 * Query params: ?agent=xxx
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    
    const searchParams = request.nextUrl.searchParams;
    const agent = searchParams.get("agent") || undefined;

    const messages = await peekMessages(name, agent);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /api/teams/[name]/inbox error:", error);
    const message = error instanceof Error ? error.message : "Failed to get messages";
    
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
 * POST /api/teams/[name]/inbox - Send a message
 * Body: { to: string, content: string, from?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { to, content, from } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "to is required" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const result = await sendMessage(name, to, content, from);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams/[name]/inbox error:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    
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
