import fs from "fs";
import path from "path";
import os from "os";
import type { AgentInstance } from "./types";

const STORE_DIR = path.join(os.homedir(), ".nanocats-manager");
const STORE_FILE = path.join(STORE_DIR, "agents-store.json");
const AGENTS_BASE_PATH = path.join(os.homedir(), "agents");
const NANOBOT_DIR_PREFIX = ".nanobot-";

// ==================== 共享配置相关常量 ====================

export const SHARED_CONFIG_DIR = path.join(STORE_DIR, "shared-config");
export const SHARED_SKILLS_DIR = path.join(SHARED_CONFIG_DIR, "skills");
export const SHARED_SKILLS_CONFIG = path.join(SHARED_CONFIG_DIR, "skills.json");
export const SHARED_MCP_CONFIG = path.join(SHARED_CONFIG_DIR, "mcp.json");
export const MANAGER_SKILL_NAME = "nanocats-manager-skill";

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

// ==================== 共享配置管理 ====================

/**
 * 确保共享配置目录存在
 */
export function ensureSharedConfig(): void {
  if (!fs.existsSync(SHARED_CONFIG_DIR)) {
    fs.mkdirSync(SHARED_CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(SHARED_SKILLS_DIR)) {
    fs.mkdirSync(SHARED_SKILLS_DIR, { recursive: true });
  }
  // 确保默认配置文件存在
  if (!fs.existsSync(SHARED_SKILLS_CONFIG)) {
    fs.writeFileSync(SHARED_SKILLS_CONFIG, JSON.stringify({ enabled: [] }, null, 2), "utf-8");
  }
  if (!fs.existsSync(SHARED_MCP_CONFIG)) {
    fs.writeFileSync(SHARED_MCP_CONFIG, JSON.stringify({ mcpServers: {} }, null, 2), "utf-8");
  }
}

/**
 * 为成员 agent 设置符号链接到共享配置
 */
export function setupMemberSymlinks(agent: AgentInstance): void {
  if (agent.role !== "member") {
    return;
  }

  ensureSharedConfig();

  const workspaceSkillsDir = path.join(agent.workspacePath, "workspace", "skills");

  // 确保 workspace/skills 目录存在
  if (!fs.existsSync(workspaceSkillsDir)) {
    fs.mkdirSync(workspaceSkillsDir, { recursive: true });
  }

  // 1. 复制 MCP 配置到 agent 的 config.json
  applyMcpConfigToAgent(agent);

  // 2. 为每个启用的 skill 创建符号链接
  applySkillsConfigToAgent(agent);
}

/**
 * 将共享配置应用到指定 agent（支持 manager 和 member）
 */
export function applySharedConfigToAgent(agent: AgentInstance): void {
  if (agent.role !== "manager" && agent.role !== "member") {
    console.log(`[SharedConfig] Agent ${agent.name} does not have shared config role, skipping`);
    return;
  }

  ensureSharedConfig();

  const workspaceSkillsDir = path.join(agent.workspacePath, "workspace", "skills");

  // 确保 workspace/skills 目录存在
  if (!fs.existsSync(workspaceSkillsDir)) {
    fs.mkdirSync(workspaceSkillsDir, { recursive: true });
  }

  // 1. 复制 MCP 配置到 agent 的 config.json
  applyMcpConfigToAgent(agent);

  // 2. 为每个启用的 skill 创建符号链接
  applySkillsConfigToAgent(agent);
}

/**
 * 将共享 MCP 配置应用到 agent 的 config.json
 */
function applyMcpConfigToAgent(agent: AgentInstance): void {
  console.log(`[SharedConfig] applyMcpConfigToAgent called for agent: ${agent.name}`);
  console.log(`[SharedConfig] agent.configPath: ${agent.configPath}`);
  
  try {
    // agent.configPath 已经包含 config.json，不需要再拼接
    const configPath = agent.configPath;
    console.log(`[SharedConfig] Target config path: ${configPath}`);
    
    // 读取 agent 的 config.json
    let agentConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        agentConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        console.log(`[SharedConfig] Read agent config.json successfully`);
      } catch {
        console.error(`[SharedConfig] Failed to parse config.json for agent ${agent.name}`);
      }
    } else {
      console.error(`[SharedConfig] config.json not found at: ${configPath}`);
    }

    // 读取共享 MCP 配置
    let sharedMcpConfig: any = { mcpServers: {} };
    console.log(`[SharedConfig] Checking shared mcp config at: ${SHARED_MCP_CONFIG}`);
    console.log(`[SharedConfig] Shared mcp config exists: ${fs.existsSync(SHARED_MCP_CONFIG)}`);
    
    if (fs.existsSync(SHARED_MCP_CONFIG)) {
      try {
        sharedMcpConfig = JSON.parse(fs.readFileSync(SHARED_MCP_CONFIG, "utf-8"));
        console.log(`[SharedConfig] Shared mcp config content:`, JSON.stringify(sharedMcpConfig));
      } catch {
        console.error(`[SharedConfig] Failed to parse shared mcp.json`);
      }
    }

    // 合并 MCP 配置：在 agent 的 tools.mcpServers 中追加共享的 servers
    if (!agentConfig.tools) {
      agentConfig.tools = {};
    }
    if (!agentConfig.tools.mcpServers) {
      agentConfig.tools.mcpServers = {};
    }
    
    // 追加共享的 mcpServers 到 agent 配置
    const sharedServers = sharedMcpConfig.mcpServers || {};
    console.log(`[SharedConfig] Shared servers to merge:`, Object.keys(sharedServers));
    
    for (const [serverName, serverConfig] of Object.entries(sharedServers)) {
      agentConfig.tools.mcpServers[serverName] = serverConfig;
    }

    // 写回 config.json
    fs.writeFileSync(configPath, JSON.stringify(agentConfig, null, 2), "utf-8");
    console.log(`[SharedConfig] Successfully wrote config.json with merged mcpServers`);
    console.log(`[SharedConfig] Final mcpServers in agent config:`, Object.keys(agentConfig.tools.mcpServers));
  } catch (error) {
    console.error(`[SharedConfig] Failed to apply MCP config to agent ${agent.name}:`, error);
  }
}

/**
 * 将共享 skills 配置应用到 agent
 */
function applySkillsConfigToAgent(agent: AgentInstance): void {
  try {
    const workspaceSkillsDir = path.join(agent.workspacePath, "workspace", "skills");
    
    // 读取启用的 skills 列表
    let enabledSkills: string[] = [];
    if (fs.existsSync(SHARED_SKILLS_CONFIG)) {
      try {
        const config = JSON.parse(fs.readFileSync(SHARED_SKILLS_CONFIG, "utf-8"));
        enabledSkills = config.enabled || [];
      } catch {
        console.error(`[SharedConfig] Failed to parse skills.json`);
      }
    }

    // 获取所有共享 skills 目录
    if (!fs.existsSync(SHARED_SKILLS_DIR)) {
      return;
    }
    const sharedSkillDirs = fs.readdirSync(SHARED_SKILLS_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    // 为每个启用的 skill 创建符号链接
    for (const skillName of enabledSkills) {
      if (!sharedSkillDirs.includes(skillName)) {
        console.log(`[SharedConfig] Skill "${skillName}" not found in shared-config/skills`);
        continue;
      }

      const sharedSkillPath = path.join(SHARED_SKILLS_DIR, skillName);
      const agentSkillSymlink = path.join(workspaceSkillsDir, skillName);

      // 如果已存在符号链接或目录，先清理
      if (fs.existsSync(agentSkillSymlink)) {
        const stats = fs.lstatSync(agentSkillSymlink);
        if (stats.isSymbolicLink() || stats.isDirectory()) {
          fs.rmSync(agentSkillSymlink, { recursive: true, force: true });
        }
      }

      // 创建符号链接
      try {
        fs.symlinkSync(sharedSkillPath, agentSkillSymlink, "junction");
        console.log(`[SharedConfig] Created skill symlink for agent ${agent.name}: ${agentSkillSymlink} -> ${sharedSkillPath}`);
      } catch (error) {
        console.error(`[SharedConfig] Failed to create skill symlink for agent ${agent.name} (${skillName}):`, error);
      }
    }
  } catch (error) {
    console.error(`[SharedConfig] Failed to apply skills config to agent ${agent.name}:`, error);
  }
}

/**
 * 清理成员 agent 的符号链接
 */
export function cleanupMemberSymlinks(agent: AgentInstance): void {
  const workspaceSkillsDir = path.join(agent.workspacePath, "workspace", "skills");
  const sharedSkillsSymlink = path.join(workspaceSkillsDir, SHARED_SKILLS_DIR.split("/").pop()!);

  if (fs.existsSync(sharedSkillsSymlink)) {
    try {
      const stats = fs.lstatSync(sharedSkillsSymlink);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(sharedSkillsSymlink);
        console.log(`[SharedConfig] Removed symlink for agent ${agent.name}: ${sharedSkillsSymlink}`);
      }
    } catch (error) {
      console.error(`[SharedConfig] Failed to remove symlink for agent ${agent.name}:`, error);
    }
  }
}

/**
 * 设置 Manager Skill 到 agent 的 workspace
 * 用于创建 Manager 角色 agent 时自动安装
 */
export function setupManagerSkill(agent: AgentInstance): void {
  const managerSkillDir = path.join(agent.workspacePath, "workspace", "skills", MANAGER_SKILL_NAME);

  // 如果已存在，跳过
  if (fs.existsSync(managerSkillDir)) {
    return;
  }

  // 确保目录存在
  fs.mkdirSync(path.join(agent.workspacePath, "workspace", "skills"), { recursive: true });

  // 创建 Manager Skill 目录
  fs.mkdirSync(managerSkillDir, { recursive: true });

  // 创建 SKILL.md
  const skillContent = `---
name: nanocats-manager-skill
description: nanocats-manager 共享配置管理能力
---

# nanocats-manager 配置管理

你可以通过 nanocats-manager 的 Web API 管理共享配置。

## 可用操作

### 管理共享 Skills
- GET /api/shared-config/skills - 列出所有共享 skills
- POST /api/shared-config/skills - 添加新 skill
- PUT /api/shared-config/skills/[name] - 启用/禁用 skill
- DELETE /api/shared-config/skills/[name] - 删除 skill

### 管理共享 MCP
- GET /api/shared-config/mcp - 获取 MCP 配置
- PUT /api/shared-config/mcp - 更新 MCP 配置

### 管理成员
- GET /api/shared-config/members - 列出所有成员 agent
- POST /api/shared-config/apply - 应用配置到成员
`;

  fs.writeFileSync(path.join(managerSkillDir, "SKILL.md"), skillContent, "utf-8");
  console.log(`[ManagerSkill] Installed nanocats-manager-skill to agent ${agent.name}`);
}

/**
 * 更新 agent 的角色
 * 角色变更时自动处理符号链接
 */
export function updateAgentRole(
  agentName: string,
  role: "manager" | "member"
): AgentInstance | undefined {
  const agent = getAgent(agentName);
  if (!agent) {
    return undefined;
  }

  const oldRole = agent.role;

  // 如果角色没有变化，直接返回
  if (oldRole === role) {
    return agent;
  }

  // 清理旧角色的配置
  if (oldRole === "member") {
    cleanupMemberSymlinks(agent);
  }

  // 应用新角色
  if (role === "manager") {
    setupManagerSkill(agent);
  } else if (role === "member") {
    ensureSharedConfig();
    setupMemberSymlinks(agent);
  }

  return updateAgent(agentName, { role });
}

/**
 * 获取所有成员 agent
 */
export function getMemberAgents(): AgentInstance[] {
  return getAgents().filter((agent) => agent.role === "member");
}

/**
 * 获取 Manager agent
 */
export function getManagerAgent(): AgentInstance | undefined {
  return getAgents().find((agent) => agent.role === "manager");
}

/**
 * 获取所有需要应用共享配置的 agents（manager + member）
 */
export function getSharedConfigAgents(): AgentInstance[] {
  return getAgents().filter((agent) => agent.role === "manager" || agent.role === "member");
}

/**
 * 获取所有成员 agent 的名称列表
 */
export function getMemberAgentNames(): string[] {
  return getMemberAgents().map((agent) => agent.name);
}

/**
 * 获取所有需要应用共享配置的 agents 名称列表（manager + member）
 */
export function getSharedConfigAgentNames(): string[] {
  return getSharedConfigAgents().map((agent) => agent.name);
}
