import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/clawteam";
import type { CreateTaskInput } from "@/lib/types";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/teams/[name]/tasks - List tasks for a team
 * Query params: ?status=xxx&owner=xxx
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const owner = searchParams.get("owner") || undefined;

    const tasks = await listTasks(name, { status, owner });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/teams/[name]/tasks error:", error);
    const message = error instanceof Error ? error.message : "Failed to list tasks";
    
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
 * POST /api/teams/[name]/tasks - Create a new task
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { description, owner, blockedBy } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    const input: CreateTaskInput = {
      teamName: name,
      description,
      owner,
      blockedBy,
    };

    const task = await createTask(input);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams/[name]/tasks error:", error);
    const message = error instanceof Error ? error.message : "Failed to create task";
    
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
