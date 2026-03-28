import { NextRequest, NextResponse } from "next/server";
import { listTemplates, launchTemplate } from "@/lib/clawteam";
import type { LaunchTemplateInput } from "@/lib/types";

/**
 * GET /api/teams/templates - List available templates
 */
export async function GET() {
  try {
    const templates = await listTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET /api/teams/templates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/templates - Launch a team from template
 * Body: { templateName: string, teamName: string, goal?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateName, teamName, goal } = body as LaunchTemplateInput;

    if (!templateName || typeof templateName !== "string") {
      return NextResponse.json(
        { error: "templateName is required" },
        { status: 400 }
      );
    }

    if (!teamName || typeof teamName !== "string") {
      return NextResponse.json(
        { error: "teamName is required" },
        { status: 400 }
      );
    }

    await launchTemplate({ templateName, teamName, goal });

    return NextResponse.json({ success: true, teamName }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams/templates error:", error);
    const message = error instanceof Error ? error.message : "Failed to launch template";
    
    if (message.includes("not found") || message.includes("不存在")) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
