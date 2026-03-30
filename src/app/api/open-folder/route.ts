import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { folderPath } = await request.json();
    
    if (!folderPath) {
      return NextResponse.json({ error: "Folder path is required" }, { status: 400 });
    }

    // 获取目录路径（如果是文件路径，则获取其父目录）
    let targetPath = folderPath;
    try {
      const stats = fs.statSync(folderPath);
      if (!stats.isDirectory()) {
        targetPath = path.dirname(folderPath);
      }
    } catch {
      // 如果路径不存在，尝试打开父目录
      targetPath = path.dirname(folderPath);
    }

    // 根据操作系统使用不同的命令
    const platform = process.platform;
    let command: string;

    if (platform === "darwin") {
      // macOS
      command = `open "${targetPath}"`;
    } else if (platform === "win32") {
      // Windows
      command = `explorer "${targetPath}"`;
    } else {
      // Linux
      command = `xdg-open "${targetPath}"`;
    }

    await execAsync(command);

    return NextResponse.json({ success: true, path: targetPath });
  } catch (error) {
    console.error("Failed to open folder:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open folder" },
      { status: 500 }
    );
  }
}
