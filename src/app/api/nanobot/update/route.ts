import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * POST /api/nanobot/update - 更新 nanobot
 * 执行: uv tool install --editable /Users/theembersguo/workspace/ai/nanobot
 */
export async function POST() {
  try {
    const nanobotPath = "/Users/theembersguo/workspace/ai/nanobot";

    const { stdout, stderr } = await execFileAsync("uv", [
      "tool",
      "install",
      "--editable",
      nanobotPath,
    ]);

    return NextResponse.json({
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    });
  } catch (error) {
    console.error("POST /api/nanobot/update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update nanobot",
        stderr: error instanceof Error && "stderr" in error ? (error as { stderr: string }).stderr : undefined,
      },
      { status: 500 }
    );
  }
}
