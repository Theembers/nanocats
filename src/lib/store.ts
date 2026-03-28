import fs from "fs";
import path from "path";
import os from "os";
import type { AgentInstance } from "./types";

const STORE_DIR = path.join(os.homedir(), ".nanocats-manager");
const STORE_FILE = path.join(STORE_DIR, "agents-store.json");
const AGENTS_BASE_PATH = path.join(os.homedir(), "agents");
const NANOBOT_DIR_PREFIX = ".nanobot-";

/**
 * 确保存储目录和文件存在，返回当前存储的所有 AgentInstance
 * 同时清理孤儿数据（无法关联到配置文件的记录）
 */
export function ensureStore(): AgentInstance[] {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }

  try {
    const data = fs.readFileSync(STORE_FILE, "utf-8");
    const agents = JSON.parse(data) as AgentInstance[];
    
    // 清理孤儿数据：过滤掉无法关联到配置文件的 agent
    const validAgents = agents.filter((agent) => {
      const configExists = fs.existsSync(agent.configPath);
      const workspaceExists = fs.existsSync(agent.workspacePath);
      
      if (!configExists || !workspaceExists) {
        console.log(`[Store Cleanup] Removing orphan agent: ${agent.name} (config exists: ${configExists}, workspace exists: ${workspaceExists})`);
        return false;
      }
      return true;
    });
    
    // 如果有孤儿数据被清理，保存清理后的结果
    if (validAgents.length !== agents.length) {
      console.log(`[Store Cleanup] Removed ${agents.length - validAgents.length} orphan agent(s)`);
      saveStore(validAgents);
    }
    
    return validAgents;
  } catch {
    // 如果文件损坏，重置为空数组
    fs.writeFileSync(STORE_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
}

/**
 * 保存 agents 数组到 JSON 文件
 */
export function saveStore(agents: AgentInstance[]): void {
  ensureStore(); // 确保目录存在
  fs.writeFileSync(STORE_FILE, JSON.stringify(agents, null, 2), "utf-8");
}

/**
 * 获取所有 agent 实例
 */
export function getAgents(): AgentInstance[] {
  return ensureStore();
}

/**
 * 根据 name 获取单个 agent（name 作为主键）
 */
export function getAgent(name: string): AgentInstance | undefined {
  const agents = ensureStore();
  return agents.find((agent) => agent.name === name);
}

/**
 * 创建新的 agent
 * 使用 name 作为主键进行唯一性检查
 */
export function createAgent(agent: AgentInstance): AgentInstance {
  const agents = ensureStore();

  // 检查是否已存在相同 name（主键）
  if (agents.some((a) => a.name === agent.name)) {
    throw new Error(`Agent with name "${agent.name}" already exists`);
  }

  agents.push(agent);
  saveStore(agents);
  return agent;
}

/**
 * 更新 agent 的部分字段
 * 使用 name 作为主键查找
 */
export function updateAgent(
  name: string,
  updates: Partial<Omit<AgentInstance, "name">>
): AgentInstance | undefined {
  const agents = ensureStore();
  const index = agents.findIndex((agent) => agent.name === name);

  if (index === -1) {
    return undefined;
  }

  agents[index] = { ...agents[index], ...updates };
  saveStore(agents);
  return agents[index];
}

/**
 * 删除 agent
 * 使用 name 作为主键查找
 */
export function deleteAgent(name: string): boolean {
  const agents = ensureStore();
  const index = agents.findIndex((agent) => agent.name === name);

  if (index === -1) {
    return false;
  }

  agents.splice(index, 1);
  saveStore(agents);
  return true;
}

/**
 * 更新 agent 的运行状态
 * 当状态变为 stopped 时，自动删除 pid
 * 使用 name 作为主键查找
 */
export function updateAgentStatus(
  name: string,
  status: AgentInstance["status"],
  pid?: number
): AgentInstance | undefined {
  const agents = ensureStore();
  const index = agents.findIndex((agent) => agent.name === name);

  if (index === -1) {
    return undefined;
  }

  agents[index].status = status;

  if (status === "stopped") {
    delete agents[index].pid;
  } else if (pid !== undefined) {
    agents[index].pid = pid;
  }

  saveStore(agents);
  return agents[index];
}

/**
 * 获取下一个可用端口
 * 从 18790 开始，找到第一个未被占用的端口
 */
export function getNextAvailablePort(): number {
  const BASE_PORT = 18790;
  const agents = ensureStore();

  const usedPorts = new Set(agents.map((agent) => agent.port));

  let port = BASE_PORT;
  while (usedPorts.has(port)) {
    port++;
  }

  return port;
}

/**
 * 从文件系统扫描并加载 agents
 * 扫描 AGENTS_BASE_PATH 下的 .nanobot-* 目录
 * 自动添加到存储中（如果不存在）
 * 自动修复重复的端口分配
 */
export function scanAndLoadAgentsFromDisk(): AgentInstance[] {
  if (!fs.existsSync(AGENTS_BASE_PATH)) {
    return ensureStore();
  }

  const agents = ensureStore();
  const existingPaths = new Set(agents.map((a) => a.workspacePath));
  let hasChanges = false;

  // 1. 先检测并修复已存在 agents 中的重复端口
  const portToAgents = new Map<number, AgentInstance[]>();
  for (const agent of agents) {
    const list = portToAgents.get(agent.port) || [];
    list.push(agent);
    portToAgents.set(agent.port, list);
  }

  // 为重复端口的 agent 分配新端口（保留第一个，其他的重新分配）
  for (const [port, agentList] of portToAgents) {
    if (agentList.length > 1) {
      console.log(`[Port Fix] Found ${agentList.length} agents using port ${port}`);
      // 保留第一个，为其他的分配新端口
      for (let i = 1; i < agentList.length; i++) {
        const agent = agentList[i];
        const usedPorts = new Set(agents.map((a) => a.port));
        let newPort = 18790;
        while (usedPorts.has(newPort)) {
          newPort++;
        }
        console.log(`[Port Fix] Reassigning port for ${agent.name}: ${agent.port} -> ${newPort}`);
        agent.port = newPort;
        hasChanges = true;
      }
    }
  }

  try {
    const entries = fs.readdirSync(AGENTS_BASE_PATH, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith(NANOBOT_DIR_PREFIX)) {
        continue;
      }

      const workspacePath = path.join(AGENTS_BASE_PATH, entry.name);
      const configPath = path.join(workspacePath, "config.json");

      // 检查是否有 config.json
      if (!fs.existsSync(configPath)) {
        continue;
      }

      // 如果已存在，跳过
      if (existingPaths.has(workspacePath)) {
        continue;
      }

      // 从目录名提取 agent 名称
      const name = entry.name.slice(NANOBOT_DIR_PREFIX.length);

      // 获取下一个可用端口（基于当前已使用的端口集合）
      const usedPorts = new Set(agents.map((a) => a.port));
      let port = 18790;
      while (usedPorts.has(port)) {
        port++;
      }

      // 创建新的 agent（不再生成 UUID，使用 name 作为主键）
      const newAgent: AgentInstance = {
        name,
        configPath,
        workspacePath,
        port,
        status: "stopped",
        createdAt: new Date().toISOString(),
      };

      agents.push(newAgent);
      // 立即将新端口加入已使用集合，确保下一个 agent 获得不同端口
      usedPorts.add(port);
      hasChanges = true;
    }

    if (hasChanges) {
      saveStore(agents);
    }
    return agents;
  } catch (error) {
    console.error("Failed to scan agents from disk:", error);
    return agents;
  }
}

// ==================== Agent Team Bindings 管理 ====================

/**
 * 更新 Agent 的 teamBindings 字段
 * 使用 agentName 作为主键
 */
export function updateAgentTeamBindings(
  agentName: string,
  bindings: { teamName: string; memberName: string }[]
): AgentInstance | undefined {
  return updateAgent(agentName, { teamBindings: bindings });
}

/**
 * 添加一条 Agent Team Binding
 * 使用 agentName 作为主键
 */
export function addAgentTeamBinding(
  agentName: string,
  teamName: string,
  memberName: string
): AgentInstance | undefined {
  const agent = getAgent(agentName);
  if (!agent) {
    return undefined;
  }

  const currentBindings = agent.teamBindings || [];
  
  // 检查是否已存在相同的 binding（去重）
  const exists = currentBindings.some(
    (b) => b.teamName === teamName && b.memberName === memberName
  );
  
  if (exists) {
    return agent;
  }

  const newBindings = [...currentBindings, { teamName, memberName }];
  return updateAgent(agentName, { teamBindings: newBindings });
}

/**
 * 移除指定 teamName 的 Agent Team Binding
 * 使用 agentName 作为主键
 */
export function removeAgentTeamBinding(
  agentName: string,
  teamName: string
): AgentInstance | undefined {
  const agent = getAgent(agentName);
  if (!agent) {
    return undefined;
  }

  const currentBindings = agent.teamBindings || [];
  
  // 过滤掉指定 teamName 的 binding
  const newBindings = currentBindings.filter((b) => b.teamName !== teamName);
  
  // 如果没有变化，直接返回
  if (newBindings.length === currentBindings.length) {
    return agent;
  }

  return updateAgent(agentName, { teamBindings: newBindings });
}
