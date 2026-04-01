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


