import { NextRequest, NextResponse } from "next/server";
import { nanobotVersion } from "@/lib/nanobot";

/**
 * GET /api/nanobot/version - 获取 nanobot 版本信息
 * Query params:
 *   - refresh=true: 强制刷新缓存，重新查找二进制文件
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true";

    const version = await nanobotVersion(forceRefresh);
    return NextResponse.json({ version });
  } catch (error) {
    console.error("GET /api/nanobot/version error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get nanobot version" },
      { status: 500 }
    );
  }
}
