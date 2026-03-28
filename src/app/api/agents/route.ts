import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getAgents,
  createAgent,
  getNextAvailablePort,
  scanAndLoadAgentsFromDisk,
} from "@/lib/store";
import { nanobotOnboard } from "@/lib/nanobot";
import { processManager } from "@/lib/process-manager";
import type { AgentInstance } from "@/lib/types";

/**
 * Sanitize name for use in file paths
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Expand ~ to home directory
 */
function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

/**
 * 默认 agents 基础路径
 */
const DEFAULT_AGENTS_PATH = "/Users/theembersguo/agents";

/**
 * GET /api/agents - List all agent instances
 * 首先扫描磁盘加载新发现的 agents，然后返回列表
 */
export async function GET() {
  try {
    // 扫描磁盘加载 agents
    const agents = scanAndLoadAgentsFromDisk();

    // 同步进程状态
    processManager.syncAllStatuses();

    const agentsWithStatus: AgentInstance[] = agents.map((agent) => {
      // 使用 agent.name 作为进程管理的 key
      const isRunning = processManager.isRunning(agent.name);
      return {
        ...agent,
        status: isRunning ? "running" : (agent.status === "error" ? "error" : "stopped"),
      };
    });

    return NextResponse.json(agentsWithStatus);
  } catch (error) {
    console.error("GET /api/agents error:", error);
    return NextResponse.json(
      { error: "Failed to get agents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents - Create a new agent instance
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, basePath, port, provider, apiKey, model } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const resolvedBasePath = expandPath(basePath || DEFAULT_AGENTS_PATH);

    if (!fs.existsSync(resolvedBasePath)) {
      fs.mkdirSync(resolvedBasePath, { recursive: true });
    }

    const sanitizedName = sanitizeName(name);
    const agentDirName = `.nanobot-${sanitizedName}`;
    const agentDir = path.join(resolvedBasePath, agentDirName);

    const configPath = path.join(agentDir, "config.json");
    const workspacePath = agentDir;

    const finalPort = port ?? getNextAvailablePort();

    await nanobotOnboard(configPath, workspacePath);

    if (provider || apiKey || model) {
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

        // 确保 agents.defaults 存在
        if (!configData.agents) configData.agents = {};
        if (!configData.agents.defaults) configData.agents.defaults = {};

        // 设置 provider 和 model 到 agents.defaults
        if (provider) configData.agents.defaults.provider = provider;
        if (model) configData.agents.defaults.model = model;

        // 设置 API key 到对应 provider 配置
        if (apiKey && provider) {
          if (!configData.providers) configData.providers = {};
          if (!configData.providers[provider]) configData.providers[provider] = {};
          configData.providers[provider].apiKey = apiKey;
        }

        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf-8");
      }
    }

    // 使用 name 作为主键，不再生成 UUID
    const newAgent: AgentInstance = {
      name,
      configPath,
      workspacePath,
      port: finalPort,
      status: "stopped",
      createdAt: new Date().toISOString(),
    };

    const createdAgent = createAgent(newAgent);

    return NextResponse.json(createdAgent, { status: 201 });
  } catch (error) {
    console.error("POST /api/agents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
