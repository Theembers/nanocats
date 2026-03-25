export interface AgentInstance {
  id: string;
  name: string;
  configPath: string;
  workspacePath: string;
  port: number;
  status: "running" | "stopped" | "error";
  pid?: number;
  createdAt: string;
}

export interface CreateAgentInput {
  name: string;
  basePath?: string;  // 默认 ~/agents/
  port?: number;
  provider?: string;
  apiKey?: string;
  model?: string;
}

export interface AgentLog {
  timestamp: string;
  stream: "stdout" | "stderr";
  content: string;
}
