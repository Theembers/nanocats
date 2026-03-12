export interface Agent {
  id: string;
  name: string;
  type: 'supervisor' | 'user' | 'task';
  model?: string;
  provider?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  workspace: string;
  model?: string;
  provider?: string;
  personality?: {
    soul_file?: string;
    system_prompt?: string;
  };
  mcp?: {
    enabled_servers?: string[];
  };
  skills?: {
    enabled?: string[];
  };
  channels?: {
    bindings?: Record<string, any>;
  };
}

export interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  channel: string;
  chat_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  session_key?: string;
}

export interface Channel {
  channel: string;
  message_count: number;
  session_count: number;
}

export interface TokenStats {
  date: string;
  agent_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cache_hits: number;
  total_calls: number;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  agent_id: string | null;
  level: string;
  category: string;
  message: string;
  details?: string;
}

export interface MCPServer {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

export interface Skill {
  name: string;
  enabled: boolean;
  description?: string;
}
