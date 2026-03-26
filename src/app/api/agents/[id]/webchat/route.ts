import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgent } from "@/lib/store";
import fs from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 读取 agent 的 webchat 配置
 * 从 config.json 中读取 channels.webchat 配置
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!fs.existsSync(agent.configPath)) {
      return NextResponse.json(
        { error: "Config file not found" },
        { status: 404 }
      );
    }

    const configContent = fs.readFileSync(agent.configPath, "utf-8");
    const config = JSON.parse(configContent);

    // 读取 webchat 配置
    const webchatConfig = config.channels?.webchat || {
      enabled: false,
      host: "0.0.0.0",
      port: agent.port + 1000, // 默认使用 agent port + 1000
      allowFrom: ["*"],
      streaming: true,
    };

    return NextResponse.json({
      enabled: webchatConfig.enabled || false,
      host: webchatConfig.host || "0.0.0.0",
      port: webchatConfig.port || agent.port + 1000,
      allowFrom: webchatConfig.allowFrom || ["*"],
      streaming: webchatConfig.streaming !== false,
      webchatUrl: `http://localhost:${webchatConfig.port || agent.port + 1000}`,
    });
  } catch (error) {
    console.error("GET /api/agents/[id]/webchat error:", error);
    return NextResponse.json(
      { error: "Failed to read webchat config" },
      { status: 500 }
    );
  }
}

/**
 * 更新 agent 的 webchat 配置
 * 写入 config.json 中的 channels.webchat 配置
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const agent = getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!fs.existsSync(agent.configPath)) {
      return NextResponse.json(
        { error: "Config file not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { enabled, port } = body;

    // 读取当前配置
    const configContent = fs.readFileSync(agent.configPath, "utf-8");
    const config = JSON.parse(configContent);

    // 确保 channels 存在
    if (!config.channels) {
      config.channels = {};
    }

    // 设置 webchat 配置
    const webchatPort = port || agent.port + 1000;
    config.channels.webchat = {
      enabled: enabled !== false,
      host: "0.0.0.0",
      port: webchatPort,
      allowFrom: ["*"],
      streaming: true,
    };

    // 写入配置
    fs.writeFileSync(agent.configPath, JSON.stringify(config, null, 2), "utf-8");

    // 更新 agent 的 webchatPort
    updateAgent(id, { webchatPort });

    return NextResponse.json({
      success: true,
      enabled: enabled !== false,
      port: webchatPort,
      webchatUrl: `http://localhost:${webchatPort}`,
    });
  } catch (error) {
    console.error("PUT /api/agents/[id]/webchat error:", error);
    return NextResponse.json(
      { error: "Failed to update webchat config" },
      { status: 500 }
    );
  }
}
