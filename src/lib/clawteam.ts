import { execFile, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import type {
  Team,
  TeamTask,
  TeamMessage,
  TeamTemplate,
  TeamBoardSnapshot,
  CreateTeamInput,
  SpawnAgentInput,
  CreateTaskInput,
  UpdateTaskInput,
  LaunchTemplateInput,
} from "./types";

const execFileAsync = promisify(execFile);

// ==================== 缓存 ====================

// 缓存找到的 clawteam 路径
let cachedClawteamPath: string | null = null;

// 使用 globalThis 缓存 boardServe 进程，避免 Next.js 热重载导致引用丢失
const globalForClawteam = globalThis as unknown as {
  boardServeProcess: ChildProcess | undefined;
  boardServePort: number | undefined;
  boardServeHost: string | undefined;
  boardServeTeam: string | undefined;
};

// ==================== 基础设施 ====================

/**
 * 清除 ~/.clawteam 目录上的 macOS com.apple.provenance 扩展属性。
 * 该属性会导致从 Next.js 进程（不同沙箱来源）调用 clawteam 时出现
 * PermissionError: [Errno 1] Operation not permitted。
 * 在每次写操作前调用以确保权限正常。
 */
async function clearMacOSProvenance(): Promise<void> {
  const clawteamDataDir = path.join(os.homedir(), ".clawteam");
  if (!fs.existsSync(clawteamDataDir)) return;
  try {
    await execFileAsync("xattr", ["-dr", "com.apple.provenance", clawteamDataDir], {
      timeout: 5000,
    });
  } catch {
    // xattr 命令失败不影响主流程，静默忽略
  }
}

/**
 * 自动发现 clawteam 可执行文件
 * 查找顺序：
 * 1. CLAWTEAM_BIN 环境变量
 * 2. which clawteam (PATH 中查找)
 * 3. 常见候选路径
 */
export async function findClawteamBinary(): Promise<string> {
  // 使用缓存的路径
  if (cachedClawteamPath) {
    return cachedClawteamPath;
  }

  // 1. 检查 CLAWTEAM_BIN 环境变量
  const envPath = process.env.CLAWTEAM_BIN;
  if (envPath && fs.existsSync(envPath)) {
    cachedClawteamPath = envPath;
    return envPath;
  }

  // 2. 使用 which 命令查找 PATH 中的 clawteam
  try {
    const { stdout } = await execFileAsync("which", ["clawteam"]);
    const whichPath = stdout.trim();
    if (whichPath && fs.existsSync(whichPath)) {
      cachedClawteamPath = whichPath;
      return whichPath;
    }
  } catch {
    // which 命令失败，继续检查候选路径
  }

  // 3. 检查常见候选路径（优先检查 uv 工具安装的路径）
  const homeDir = os.homedir();
  const candidatePaths = [
    // uv 工具安装路径（优先级最高）
    path.join(homeDir, ".local/share/uv/tools/clawteam/bin/clawteam"),
    path.join(homeDir, ".local/bin/clawteam"),
    // 其他路径
    "/opt/homebrew/bin/clawteam",
    "/usr/local/bin/clawteam",
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      cachedClawteamPath = candidatePath;
      return candidatePath;
    }
  }

  // 4. 都没找到，抛出错误
  throw new Error(
    "无法找到 clawteam 可执行文件。请设置 CLAWTEAM_BIN 环境变量指向 clawteam 的路径，" +
      "或确保 clawteam 已安装在 PATH 中。"
  );
}

/**
 * 清除缓存的 clawteam 路径（用于测试或路径变更时）
 */
export function clearClawteamPathCache(): void {
  cachedClawteamPath = null;
}

/**
 * 执行 clawteam 命令（带 --json 标志）
 * @param args 命令参数（不包含 --json，会自动添加）
 * @returns 解析后的 JSON 数据
 */
async function execClawteam<T = unknown>(args: string[]): Promise<T> {
  const clawteamPath = await findClawteamBinary();

  // 写操作前清除 macOS provenance 属性
  await clearMacOSProvenance();

  try {
    // --json 标志放在最前面
    const { stdout } = await execFileAsync(clawteamPath, ["--json", ...args], {
      timeout: 60000, // 60秒超时
      maxBuffer: 10 * 1024 * 1024, // 10MB 缓冲区
    });

    return JSON.parse(stdout) as T;
  } catch (error) {
    if (error instanceof Error) {
      // 尝试从 stderr 获取更多错误信息
      const execError = error as Error & { stderr?: string; code?: number };
      const message = execError.stderr || error.message;
      throw new Error(`clawteam 命令执行失败: ${message}`);
    }
    throw error;
  }
}

/**
 * 执行 clawteam 命令（不带 --json 标志，用于 spawn、launch 等特殊命令）
 * @param args 命令参数
 * @returns stdout 输出
 */
async function execClawteamRaw(args: string[]): Promise<string> {
  const clawteamPath = await findClawteamBinary();

  // 写操作前清除 macOS provenance 属性
  await clearMacOSProvenance();

  try {
    const { stdout } = await execFileAsync(clawteamPath, args, {
      timeout: 300000, // 5分钟超时（spawn/launch 可能需要较长时间）
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout;
  } catch (error) {
    if (error instanceof Error) {
      const execError = error as Error & { stderr?: string; code?: number };
      const message = execError.stderr || error.message;
      throw new Error(`clawteam 命令执行失败: ${message}`);
    }
    throw error;
  }
}

/**
 * 获取 clawteam 版本信息
 * @param forceRefresh 是否强制重新查找二进制文件路径
 */
export async function clawteamVersion(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    clearClawteamPathCache();
  }
  const clawteamPath = await findClawteamBinary();

  const { stdout } = await execFileAsync(clawteamPath, ["--version"]);

  return stdout.trim();
}

// ==================== Team 管理 ====================

interface TeamDiscoverItem {
  name: string;
  description: string;
  leadAgentId: string;
  memberCount: number;
}

/**
 * 列出所有已发现的 Team
 */
export async function listTeams(): Promise<Team[]> {
  const result = await execClawteam<TeamDiscoverItem[]>(["team", "discover"]);

  // clawteam --json team discover 返回的是数组，不是对象
  const teams = Array.isArray(result) ? result : [];

  return teams.map((t) => ({
    name: t.name,
    description: t.description,
    leaderName: t.leadAgentId,
    agents: [],
    createdAt: new Date().toISOString(), // discover 接口不返回创建时间，使用当前时间
    status: "active", // discover 接口不返回状态，默认为 active
  }));
}

/**
 * 创建新 Team
 */
export async function createTeam(input: CreateTeamInput): Promise<void> {
  const args = [
    "team",
    "spawn-team",
    input.name,
    "-d",
    input.description,
    "-n",
    input.leaderName,
  ];

  await execClawteamRaw(args);
}

interface TeamStatusResult {
  name: string;
  description: string;
  leader_name: string;
  created_at: string;
  status: string;
  members: Array<{
    name: string;
    role: string;
    task?: string;
    status: string;
  }>;
}

/**
 * 获取 Team 详情（含成员列表）
 */
export async function showTeam(name: string): Promise<Team> {
  const result = await execClawteam<TeamStatusResult>(["team", "status", name]);

  return {
    name: result.name,
    description: result.description,
    leaderName: result.leader_name,
    createdAt: result.created_at,
    status: result.status === "active" ? "active" : "stopped",
    agents: result.members.map((m) => ({
      name: m.name,
      role: m.role,
      task: m.task,
      status:
        m.status === "running"
          ? "running"
          : m.status === "pending"
            ? "pending"
            : "stopped",
    })),
  };
}

/**
 * 删除 Team
 */
export async function deleteTeam(name: string): Promise<void> {
  await execClawteamRaw(["team", "cleanup", "--force", name]);
}

// ==================== Agent Spawn ====================

/**
 * 在 Team 中启动新的 Agent
 */
export async function spawnAgent(input: SpawnAgentInput): Promise<void> {
  const args = ["spawn", "--team", input.teamName, "--agent-name", input.agentName];

  if (input.task) {
    args.push("--task", input.task);
  }

  await execClawteamRaw(args);
}

/**
 * 终止 Team 中的 Agent
 */
export async function killAgent(
  teamName: string,
  agentName: string
): Promise<void> {
  await execClawteamRaw(["spawn", "--team", teamName, "--kill", agentName]);
}

// ==================== Task 管理 ====================

interface TaskListItem {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  status: string;
  blockedBy?: string[];
  blocked_by?: string[];
}

/**
 * 列出 Team 的所有任务
 */
export async function listTasks(
  teamName: string,
  filters?: { status?: string; owner?: string }
): Promise<TeamTask[]> {
  const args = ["task", "list", teamName];

  if (filters?.status) {
    args.push("--status", filters.status);
  }
  if (filters?.owner) {
    args.push("--owner", filters.owner);
  }

  const result = await execClawteam<TaskListItem[]>(args);

  // CLI 直接返回数组，不是嵌套对象
  const taskArray = Array.isArray(result) ? result : [];

  return taskArray.map((t) => ({
    id: t.id,
    description: t.subject,
    owner: t.owner,
    status:
      t.status === "in_progress"
        ? "in_progress"
        : t.status === "completed"
          ? "completed"
          : "pending",
    blockedBy: t.blockedBy || t.blocked_by || [],
  }));
}

interface TaskCreateResult {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  status: string;
  blockedBy?: string[];
  blocked_by?: string[];
}

/**
 * 创建新任务
 */
export async function createTask(input: CreateTaskInput): Promise<TeamTask> {
  const args = ["task", "create", input.teamName, input.description];

  if (input.owner) {
    args.push("--owner", input.owner);
  }
  if (input.blockedBy && input.blockedBy.length > 0) {
    args.push("--blocked-by", input.blockedBy.join(","));
  }

  const result = await execClawteam<TaskCreateResult>(args);

  return {
    id: result.id,
    description: result.subject,
    owner: result.owner,
    status:
      result.status === "in_progress"
        ? "in_progress"
        : result.status === "completed"
          ? "completed"
          : "pending",
    blockedBy: result.blockedBy || result.blocked_by || [],
  };
}

interface TaskGetResult {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  status: string;
  blockedBy?: string[];
  blocked_by?: string[];
  blocks?: string[];
}

/**
 * 获取任务详情
 */
export async function getTask(
  teamName: string,
  taskId: string
): Promise<TeamTask> {
  const result = await execClawteam<TaskGetResult>([
    "task",
    "get",
    teamName,
    taskId,
  ]);

  return {
    id: result.id,
    description: result.subject,
    owner: result.owner,
    status:
      result.status === "in_progress"
        ? "in_progress"
        : result.status === "completed"
          ? "completed"
          : "pending",
    blockedBy: result.blockedBy || result.blocked_by || [],
  };
}

/**
 * 更新任务
 */
export async function updateTask(
  teamName: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TeamTask> {
  const args = ["task", "update", teamName, taskId];

  if (input.status) {
    args.push("--status", input.status);
  }
  if (input.owner) {
    args.push("--owner", input.owner);
  }

  const result = await execClawteam<TaskGetResult>(args);

  return {
    id: result.id,
    description: result.subject,
    owner: result.owner,
    status:
      result.status === "in_progress"
        ? "in_progress"
        : result.status === "completed"
          ? "completed"
          : "pending",
    blockedBy: result.blockedBy || result.blocked_by || [],
  };
}

interface TaskStatsResult {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

/**
 * 获取任务统计
 */
export async function getTaskStats(teamName: string): Promise<TaskStatsResult> {
  return await execClawteam<TaskStatsResult>(["task", "stats", teamName]);
}

// ==================== Inbox 消息 ====================

interface InboxMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

/**
 * 查看消息（不消费）
 */
export async function peekMessages(
  teamName: string,
  agent?: string
): Promise<TeamMessage[]> {
  const args = ["inbox", "peek", teamName];

  if (agent) {
    args.push("-a", agent);
  }

  const result = await execClawteam<InboxMessage[]>(args);

  // CLI 直接返回数组，不是嵌套对象
  const messages = Array.isArray(result) ? result : [];

  return messages.map((m) => ({
    id: m.id,
    from: m.from,
    to: m.to,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

/**
 * 接收消息（消费）
 */
export async function receiveMessages(
  teamName: string,
  agent?: string,
  limit?: number
): Promise<TeamMessage[]> {
  const args = ["inbox", "receive", teamName];

  if (agent) {
    args.push("-a", agent);
  }
  if (limit !== undefined) {
    args.push("--limit", String(limit));
  }

  const result = await execClawteam<InboxMessage[]>(args);

  // CLI 直接返回数组，不是嵌套对象
  const messages = Array.isArray(result) ? result : [];

  return messages.map((m) => ({
    id: m.id,
    from: m.from,
    to: m.to,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

interface InboxSendResult {
  id: string;
  success: boolean;
}

/**
 * 发送消息
 */
export async function sendMessage(
  teamName: string,
  to: string,
  content: string,
  from?: string
): Promise<{ id: string; success: boolean }> {
  const args = ["inbox", "send", teamName, to, content];

  if (from) {
    args.push("--from", from);
  }

  return await execClawteam<InboxSendResult>(args);
}

/**
 * 获取消息历史日志
 */
export async function getMessageLog(
  teamName: string,
  limit?: number
): Promise<TeamMessage[]> {
  const args = ["inbox", "log", teamName];

  if (limit !== undefined) {
    args.push("--limit", String(limit));
  }

  const result = await execClawteam<InboxMessage[]>(args);

  // CLI 直接返回数组，不是嵌套对象
  const messages = Array.isArray(result) ? result : [];

  return messages.map((m) => ({
    id: m.id,
    from: m.from,
    to: m.to,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

// ==================== Board 监控 ====================

interface BoardTaskItem {
  id: string;
  subject: string;
  owner?: string;
  status: string;
  blockedBy?: string[];
  blocked_by?: string[];
}

interface BoardShowResult {
  team: {
    name: string;
    description: string;
    leader_name: string;
    created_at: string;
    status: string;
  };
  members: Array<{
    name: string;
    role: string;
    task?: string;
    status: string;
  }>;
  tasks: BoardTaskItem[];
  messages: InboxMessage[];
  cost?: {
    total_tokens: number;
    total_cost: number;
  };
}

/**
 * 获取 Team Board 完整快照
 */
export async function boardShow(teamName: string): Promise<TeamBoardSnapshot> {
  const result = await execClawteam<BoardShowResult>(["board", "show", teamName]);

  return {
    teamName: result.team.name,
    agents: result.members.map((m) => ({
      name: m.name,
      role: m.role,
      task: m.task,
      status:
        m.status === "running"
          ? "running"
          : m.status === "pending"
            ? "pending"
            : "stopped",
    })),
    tasks: result.tasks.map((t) => ({
      id: t.id,
      description: t.subject,
      owner: t.owner,
      status:
        t.status === "in_progress"
          ? "in_progress"
          : t.status === "completed"
            ? "completed"
            : "pending",
      blockedBy: t.blockedBy || t.blocked_by || [],
    })),
    messages: result.messages.map((m) => ({
      id: m.id,
      from: m.from,
      to: m.to,
      content: m.content,
      timestamp: m.timestamp,
    })),
    timestamp: new Date().toISOString(),
  };
}

interface BoardOverviewItem {
  name: string;
  description: string;
  member_count: number;
  task_count: number;
  status: string;
}

/**
 * 获取所有团队概览
 */
export async function boardOverview(): Promise<{ teams: BoardOverviewItem[] }> {
  const result = await execClawteam<BoardOverviewItem[]>(["board", "overview"]);

  // CLI 直接返回数组，不是嵌套对象
  const teams = Array.isArray(result) ? result : [];

  return { teams };
}

// ==================== Board Serve 进程管理 ====================

export interface BoardServeStatus {
  running: boolean;
  port?: number;
  host?: string;
  team?: string;
  pid?: number;
}

/**
 * 启动 Board Serve WebUI
 */
export async function startBoardServe(options?: {
  port?: number;
  host?: string;
  team?: string;
}): Promise<BoardServeStatus> {
  // 如果已有进程在运行，先停止
  if (globalForClawteam.boardServeProcess) {
    await stopBoardServe();
  }

  const clawteamPath = await findClawteamBinary();

  const args = ["board", "serve"];

  const port = options?.port || 8080;
  const host = options?.host || "127.0.0.1";

  if (options?.port) {
    args.push("--port", String(options.port));
  }
  if (options?.host) {
    args.push("--host", options.host);
  }
  if (options?.team) {
    args.push("--team", options.team);
  }

  const childProcess = spawn(clawteamPath, args, {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const pid = childProcess.pid;
  if (!pid) {
    throw new Error("Failed to start board serve process: no PID returned");
  }

  // 保存进程引用到 globalThis
  globalForClawteam.boardServeProcess = childProcess;
  globalForClawteam.boardServePort = port;
  globalForClawteam.boardServeHost = host;
  globalForClawteam.boardServeTeam = options?.team;

  // 监听进程关闭，清理引用
  childProcess.on("close", () => {
    globalForClawteam.boardServeProcess = undefined;
    globalForClawteam.boardServePort = undefined;
    globalForClawteam.boardServeHost = undefined;
    globalForClawteam.boardServeTeam = undefined;
  });

  childProcess.on("error", () => {
    globalForClawteam.boardServeProcess = undefined;
    globalForClawteam.boardServePort = undefined;
    globalForClawteam.boardServeHost = undefined;
    globalForClawteam.boardServeTeam = undefined;
  });

  return {
    running: true,
    port,
    host,
    team: options?.team,
    pid,
  };
}

/**
 * 停止 Board Serve WebUI
 */
export async function stopBoardServe(): Promise<void> {
  const childProcess = globalForClawteam.boardServeProcess;

  if (!childProcess) {
    return;
  }

  return new Promise<void>((resolve) => {
    let killed = false;

    const onClose = () => {
      killed = true;
      globalForClawteam.boardServeProcess = undefined;
      globalForClawteam.boardServePort = undefined;
      globalForClawteam.boardServeHost = undefined;
      globalForClawteam.boardServeTeam = undefined;
      resolve();
    };

    childProcess.once("close", onClose);

    // 先发送 SIGTERM
    childProcess.kill("SIGTERM");

    // 3秒后检查是否还存活
    setTimeout(() => {
      if (!killed && isProcessAlive(childProcess.pid)) {
        childProcess.kill("SIGKILL");
      }
    }, 3000);

    // 设置最大等待时间（5秒）
    setTimeout(() => {
      if (!killed) {
        childProcess.removeListener("close", onClose);
        globalForClawteam.boardServeProcess = undefined;
        globalForClawteam.boardServePort = undefined;
        globalForClawteam.boardServeHost = undefined;
        globalForClawteam.boardServeTeam = undefined;
        resolve();
      }
    }, 5000);
  });
}

/**
 * 获取 Board Serve 状态
 */
export function getBoardServeStatus(): BoardServeStatus {
  const childProcess = globalForClawteam.boardServeProcess;

  if (!childProcess || !isProcessAlive(childProcess.pid)) {
    return { running: false };
  }

  return {
    running: true,
    port: globalForClawteam.boardServePort,
    host: globalForClawteam.boardServeHost,
    team: globalForClawteam.boardServeTeam,
    pid: childProcess.pid,
  };
}

/**
 * 检查 PID 对应的进程是否存活
 */
function isProcessAlive(pid: number | undefined): boolean {
  if (!pid) {
    return false;
  }

  try {
    // kill(pid, 0) 不会杀死进程，只是检查进程是否存在
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ==================== Launch 模板 ====================

interface TemplateListItem {
  name: string;
  description: string;
  version?: string;
}

/**
 * 列出可用模板
 */
export async function listTemplates(): Promise<TeamTemplate[]> {
  const result = await execClawteam<TemplateListItem[]>(["template", "list"]);

  // CLI 直接返回数组，不是嵌套对象
  const templates = Array.isArray(result) ? result : [];

  return templates.map((t) => ({
    name: t.name,
    description: t.description,
    version: t.version,
    agents: [],
    tasks: [],
  }));
}

/**
 * 使用模板启动 Team
 */
export async function launchTemplate(input: LaunchTemplateInput): Promise<void> {
  const args = ["launch", input.templateName, "--team", input.teamName];

  if (input.goal) {
    args.push("--goal", input.goal);
  }

  await execClawteamRaw(args);
}

// ==================== Team Member 管理 ====================

/**
 * 添加成员到 Team
 */
export async function addMemberToTeam(
  teamName: string,
  memberName: string,
  agentId?: string,
  agentType?: string
): Promise<void> {
  const args = ["team", "add-member", teamName, memberName];

  if (agentId) {
    args.push("--agent-id", agentId);
  }
  if (agentType) {
    args.push("--agent-type", agentType);
  }

  await execClawteamRaw(args);
}

/**
 * 从 Team 移除成员
 * 由于 clawteam CLI 没有 remove-member 命令，直接操作配置文件
 */
export async function removeMemberFromTeam(
  teamName: string,
  memberName: string
): Promise<void> {
  const teamConfigPath = path.join(os.homedir(), ".clawteam", "teams", teamName, "config.json");

  if (!fs.existsSync(teamConfigPath)) {
    throw new Error(`Team ${teamName} not found`);
  }

  const configData = fs.readFileSync(teamConfigPath, "utf-8");
  const config = JSON.parse(configData);

  if (!config.members || !Array.isArray(config.members)) {
    throw new Error(`Member ${memberName} not found in team ${teamName}`);
  }

  const memberIndex = config.members.findIndex((m: { name: string }) => m.name === memberName);

  if (memberIndex === -1) {
    throw new Error(`Member ${memberName} not found in team ${teamName}`);
  }

  config.members.splice(memberIndex, 1);

  // 写操作前清除 macOS provenance 属性
  await clearMacOSProvenance();

  fs.writeFileSync(teamConfigPath, JSON.stringify(config, null, 2), "utf-8");
}

// ==================== Lifecycle ====================

/**
 * 请求 Agent 关闭
 */
export async function requestShutdown(
  teamName: string,
  agentName: string
): Promise<void> {
  await execClawteamRaw(["lifecycle", "request-shutdown", teamName, agentName]);
}
