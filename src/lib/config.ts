/**
 * nanocats-manager 统一配置模块
 *
 * 所有路径常量集中管理，支持根目录配置。
 * 根目录默认: ~/nanocats-space
 *   - 配置: ~/nanocats-space/nanocats-manager/
 *   - 实例: ~/nanocats-space/agents/
 */

import os from "os";
import path from "path";

/**
 * 根目录 - 可通过环境变量 NANOCATS_ROOT 覆盖
 */
export const ROOT_DIR = process.env.NANOCATS_ROOT
  ? path.resolve(process.env.NANOCATS_ROOT)
  : path.join(os.homedir(), "nanocats-space");

/**
 * nanocats-manager 配置目录
 */
export const MANAGER_DIR = path.join(ROOT_DIR, "nanocats-manager");

/**
 * Agent 注册表
 */
export const STORE_FILE = path.join(MANAGER_DIR, "agents-store.json");

/**
 * 共享配置目录
 */
export const SHARED_CONFIG_DIR = path.join(MANAGER_DIR, "shared-config");

/**
 * 备份目录
 */
export const BACKUP_DIR = path.join(MANAGER_DIR, "backups");

/**
 * 共享 Skills 目录
 */
export const SHARED_SKILLS_DIR = path.join(SHARED_CONFIG_DIR, "skills");

/**
 * 共享 Skills 配置
 */
export const SHARED_SKILLS_CONFIG = path.join(SHARED_CONFIG_DIR, "skills.json");

/**
 * 共享 MCP 配置
 */
export const SHARED_MCP_CONFIG = path.join(SHARED_CONFIG_DIR, "mcp.json");

/**
 * CLI 操作日志目录
 */
export const CLI_LOG_DIR = path.join(MANAGER_DIR, "logs");

/**
 * 上传文件目录
 */
export const UPLOADS_DIR = path.join(MANAGER_DIR, "uploads");

/**
 * Agent 实例根目录
 */
export const AGENTS_DIR = path.join(ROOT_DIR, "agents");

/**
 * nanobot 目录前缀 (.nanobot-{name})
 */
export const NANOBOT_DIR_PREFIX = ".nanobot-";

/**
 * 获取 Agent 目录名
 */
export function getAgentDirName(name: string): string {
  return `${NANOBOT_DIR_PREFIX}${name}`;
}

/**
 * 获取 Agent 根目录
 */
export function getAgentDir(agentName: string): string {
  return path.join(AGENTS_DIR, getAgentDirName(agentName));
}

/**
 * 获取 Agent config.json 路径
 */
export function getAgentConfigPath(agentName: string): string {
  return path.join(getAgentDir(agentName), "config.json");
}

/**
 * 获取 Agent workspace 路径
 */
export function getAgentWorkspacePath(agentName: string): string {
  return path.join(getAgentDir(agentName), "workspace");
}

/**
 * 获取 Agent .env 文件路径
 */
export function getAgentEnvPath(agentName: string): string {
  return path.join(getAgentDir(agentName), ".env");
}

/**
 * 获取 Agent 上传目录
 */
export function getAgentUploadsDir(agentId: string): string {
  return path.join(UPLOADS_DIR, agentId);
}
