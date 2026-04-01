import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

// 缓存找到的 nanobot 路径
let cachedNanobotPath: string | null = null;

/**
 * 自动发现 nanobot 可执行文件
 * 查找顺序：
 * 1. NANOBOT_BIN 环境变量
 * 2. which nanobot (PATH 中查找)
 * 3. 常见候选路径
 */
export async function findNanobotBinary(): Promise<string> {
  // 使用缓存的路径
  if (cachedNanobotPath) {
    return cachedNanobotPath;
  }

  // 1. 检查 NANOBOT_BIN 环境变量
  const envPath = process.env.NANOBOT_BIN;
  if (envPath && fs.existsSync(envPath)) {
    cachedNanobotPath = envPath;
    return envPath;
  }

  // 2. 使用 which 命令查找 PATH 中的 nanobot
  try {
    const { stdout } = await execFileAsync("which", ["nanobot"]);
    const whichPath = stdout.trim();
    if (whichPath && fs.existsSync(whichPath)) {
      cachedNanobotPath = whichPath;
      return whichPath;
    }
  } catch {
    // which 命令失败，继续检查候选路径
  }

  // 3. 检查常见候选路径（优先检查 uv 工具安装的路径）
  const homeDir = os.homedir();
  const candidatePaths = [
    // uv 工具安装路径（优先级最高）
    path.join(homeDir, ".local/share/uv/tools/nanobot-ai/bin/nanobot"),
    path.join(homeDir, ".local/bin/nanobot"),
    // 其他路径
    "/opt/homebrew/bin/nanobot",
    "/usr/local/bin/nanobot",
    path.join(homeDir, "workspace/ai/nanobot/.venv/bin/nanobot"),
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      cachedNanobotPath = candidatePath;
      return candidatePath;
    }
  }

  // 4. 都没找到，抛出错误
  throw new Error(
    "无法找到 nanobot 可执行文件。请设置 NANOBOT_BIN 环境变量指向 nanobot 的路径，" +
      "或确保 nanobot 已安装在 PATH 中。"
  );
}

/**
 * 清除缓存的 nanobot 路径（用于测试或路径变更时）
 */
export function clearNanobotPathCache(): void {
  cachedNanobotPath = null;
}

/**
 * 调用 nanobot onboard 命令初始化 agent 配置
 */
export async function nanobotOnboard(
  configPath: string,
  workspacePath: string
): Promise<{ stdout: string; stderr: string }> {
  const nanobotPath = await findNanobotBinary();

  const { stdout, stderr } = await execFileAsync(nanobotPath, [
    "onboard",
    "--config",
    configPath,
    "--workspace",
    workspacePath,
  ]);

  return { stdout, stderr };
}

/**
 * 获取 nanobot 版本信息
 * @param forceRefresh 是否强制重新查找二进制文件路径
 */
export async function nanobotVersion(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    clearNanobotPathCache();
  }
  const nanobotPath = await findNanobotBinary();

  const { stdout } = await execFileAsync(nanobotPath, ["--version"]);

  return stdout.trim();
}
