// ==================== Agent Role Types ====================

export type AgentRole = "manager" | "member";

export interface AgentInstance {
  name: string;
  configPath: string;
  workspacePath: string;
  port: number;
  webchatPort?: number;
  status: "running" | "stopped" | "error";
  pid?: number;
  createdAt: string;
  role?: AgentRole;  // Agent 角色：manager 或 member
  teamBindings?: { teamName: string; memberName: string }[];
}

// ==================== Shared Config Types ====================

export interface SharedConfig {
  skills: SharedSkill[];
  mcp: McpConfig | null;
}

export interface SharedSkill {
  name: string;
  path: string;
  description?: string;
  enabled: boolean;
}

export interface McpConfig {
  servers: Record<string, any>;
}

export interface CreateAgentInput {
  name: string;
  basePath?: string;  // 默认 ~/agents/
  port?: number;
  provider?: string;
  apiKey?: string;
  model?: string;
  role?: AgentRole;  // Agent 角色
}

export interface AgentLog {
  timestamp: string;
  stream: "stdout" | "stderr";
  content: string;
}

// ==================== ClawTeam Team Types ====================

export interface Team {
  name: string;
  description: string;
  leaderName: string;
  agents: TeamAgent[];
  createdAt: string;
  status: "active" | "stopped";
}

export interface TeamAgent {
  name: string;
  role: string;
  task?: string;
  status: "running" | "stopped" | "pending";
}

export interface TeamTask {
  id: string;
  description: string;
  owner?: string;
  status: "pending" | "in_progress" | "completed";
  blockedBy: string[];
}

export interface TeamMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

export interface TeamTemplate {
  name: string;
  description: string;
  version?: string;
  agents: TeamTemplateAgent[];
  tasks: TeamTemplateTask[];
}

export interface TeamTemplateAgent {
  name: string;
  role: string;
  description?: string;
}

export interface TeamTemplateTask {
  id: string;
  description: string;
  owner?: string;
  blockedBy?: string[];
}

export interface CreateTeamInput {
  name: string;
  description: string;
  leaderName: string;
}

export interface SpawnAgentInput {
  teamName: string;
  agentName: string;
  task?: string;
}

export interface CreateTaskInput {
  teamName: string;
  description: string;
  owner?: string;
  blockedBy?: string[];
}

export interface UpdateTaskInput {
  status?: "pending" | "in_progress" | "completed";
  owner?: string;
}

export interface LaunchTemplateInput {
  templateName: string;
  teamName: string;
  goal?: string;
}

export interface TeamBoardSnapshot {
  teamName: string;
  agents: TeamAgent[];
  tasks: TeamTask[];
  messages: TeamMessage[];
  timestamp: string;
}
