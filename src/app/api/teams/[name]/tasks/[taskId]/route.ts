import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask } from "@/lib/clawteam";
import type { UpdateTaskInput } from "@/lib/types";

interface RouteParams {
  params: Promise<{ name: string; taskId: string }>;
}

/**
 * GET /api/teams/[name]/tasks/[taskId] - Get task details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, taskId } = await params;
    const task = await getTask(name, taskId);
    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/teams/[name]/tasks/[taskId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to get task";
    
    if (message.includes("not found") || message.includes("不存在")) {
      return NextResponse.json(
        { error: "Task or team not found" },
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
 * PUT /api/teams/[name]/tasks/[taskId] - Update task
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { name, taskId } = await params;
    const body = await request.json();
    const { status, owner } = body as UpdateTaskInput;

    const updatedTask = await updateTask(name, taskId, { status, owner });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PUT /api/teams/[name]/tasks/[taskId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update task";
    
    if (message.includes("not found") || message.includes("不存在")) {
      return NextResponse.json(
        { error: "Task or team not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
