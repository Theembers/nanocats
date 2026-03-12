<div align="center">
  <img src="nanocats_logo.png" alt="nanocats" width="500">
  <h1>nanocats: 超轻量级个人 AI 助手</h1>
  <p>
    <img src="https://img.shields.io/badge/python-≥3.11-blue" alt="Python">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </p>
</div>

> 🙏 **基于 [nanobot](https://github.com/HKUDS/nanobot) 开发** — nanocats 构建在优秀的 nanobot 基础之上，扩展了 Agent Swarm 能力和多智能体编排功能。

## 📢 新闻

- **2026-03-12** 🌐 新增 Web 管理界面，支持 Agent 管理、对话界面、Token 统计和日志查看
- **2026-03-11** 🎉 项目初始化 — 从 nanobot 分支，重命名为 nanocats，支持 Agent Swarm

## 核心特性

🤖 **Agent Swarm**: 层级式多智能体系统（Supervisor → User Agent → Task Agent）

🏢 **独立工作空间**: 每个 Agent 拥有隔离的工作空间

🔧 **Agent 级 MCP 配置**: MCP 服务器统一安装，但支持按 Agent 独立配置

📱 **Agent 级渠道绑定**: 每个用户 Agent 可拥有独立的通讯渠道配置

🌐 **Web 管理界面**: 内置 Web UI，支持 Agent 管理、对话、配置和监控

📊 **Token 分析**: 按时间/模型/Agent 维度追踪 Token 消耗、缓存命中和成本

📝 **活动日志**: 查看 Model 调用、MCP 执行、Skill 使用和工具调用

⚡️ **极速响应**：极小的代码量意味着更快的启动速度、更低的资源占用和更快的迭代周期

💎 **易于使用**：一键部署，即刻上手

## 🏗️ 架构

<p align="center">
  <img src="nanocats_arch.png" alt="架构" width="800">
</p>

## 目录

- [新闻](#-新闻)
- [核心特性](#核心特性)
- [架构](#️-架构)
- [安装](#-安装)
- [快速开始](#-快速开始)
- [Web 界面](#-web-界面)
- [聊天应用](#-聊天应用)
- [配置](#️-配置)
- [CLI 参考](#-cli-参考)
- [项目结构](#-项目结构)

## 📦 安装

**从源码安装**（最新功能，推荐开发使用）

```bash
git clone https://github.com/Theembers/nanocats.git
cd nanocats
pip install -e ".[web]" --break-system-packages
```

> [!NOTE]
> macOS 上使用 Homebrew Python 需要添加 `--break-system-packages` 参数。其他系统或使用虚拟环境时可省略此参数。

**构建 Web 界面**（首次安装或前端代码修改后需要执行）

```bash
cd nanocats/web/frontend
npm install && npm run build
```

## 🚀 快速开始

> [!TIP]
> 在 `~/.nanocats/config.json` 中设置你的 API 密钥。
> 获取 API 密钥：[OpenRouter](https://openrouter.ai/keys)（全球）

**1. 初始化**

```bash
nanocats onboard
```

**2. 配置**（`~/.nanocats/config.json`）

*设置 API 密钥*：
```json
{
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-v1-xxx"
    }
  }
}
```

*设置模型*：
```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-5",
      "provider": "openrouter"
    }
  }
}
```

**3. 开始聊天**

```bash
nanocats agent
```

## 🌐 Web 界面

nanocats 内置 Web 管理界面，支持 Agent 管理、对话和监控。

**启动 Web 服务器：**

```bash
nanocats web
```

**访问界面：**

- 📱 Web UI: http://localhost:8080
- 📚 API 文档: http://localhost:8080/docs

**功能概览：**

| 功能 | 描述 |
|---------|-------------|
| **Agent 登录** | 使用 Agent ID 和 Token 登录 |
| **对话界面** | 与 Agent 实时对话 |
| **Agent 配置** | 配置人格、模型、提供商设置 |
| **MCP/Skill 管理** | 安装和管理 MCP 服务器和技能 |
| **Token 统计** | 按时间/模型/Agent 查看图表和表格 |
| **活动日志** | 监控模型调用、MCP、技能和工具执行 |

**登录方式：**

1. Agent ID: 你的 Agent 配置 ID（如 `test_agent`）
2. Token: 测试时使用 `admin`，或在 Agent 配置中设置自定义 Token

## 💬 聊天应用

将系统连接到你喜欢的聊天平台。

| 渠道 | 所需信息 |
|---------|---------------|
| **Telegram** | 来自 @BotFather 的 Bot token |
| **Discord** | Bot token + Message Content intent |
| **飞书** | App ID + App Secret |
| **钉钉** | App Key + App Secret |
| **Slack** | Bot token + App-Level token |
| **Email** | IMAP/SMTP 凭证 |
| **WhatsApp** | 扫描二维码 |
| **QQ** | App ID + App Secret |

<details>
<summary><b>Telegram</b>（推荐）</summary>

**1. 创建机器人**
- 打开 Telegram，搜索 `@BotFather`
- 发送 `/newbot`，按提示操作
- 复制 token

**2. 配置**

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["YOUR_USER_ID"]
    }
  }
}
```

**3. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Discord</b></summary>

**1. 创建机器人**
- 访问 https://discord.com/developers/applications
- 创建应用 → Bot → Add Bot
- 复制机器人 token

**2. 启用 intents**
- 在 Bot 设置中，启用 **MESSAGE CONTENT INTENT**

**3. 配置**

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["YOUR_USER_ID"],
      "groupPolicy": "mention"
    }
  }
}
```

**4. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>飞书</b></summary>

使用 **WebSocket** 长连接 — 无需公网 IP。

**1. 创建飞书机器人**
- 访问 [飞书开放平台](https://open.feishu.cn/app)
- 创建新应用 → 启用 **机器人** 能力
- **权限**：添加 `im:message`（发送消息）和 `im:message.p2p_msg:readonly`（接收消息）
- **事件**：添加 `im.message.receive_v1`（接收消息）
  - 选择 **长连接** 模式
- 从"凭证与基础信息"获取 **App ID** 和 **App Secret**
- 发布应用

**2. 配置**

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "allowFrom": ["ou_YOUR_OPEN_ID"]
    }
  }
}
```

**3. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>钉钉</b></summary>

使用 **Stream 模式** — 无需公网 IP。

**1. 创建钉钉机器人**
- 访问 [钉钉开放平台](https://open-dev.dingtalk.com/)
- 创建新应用 → 添加 **机器人** 能力
- **配置**：开启 **Stream 模式**
- **权限**：添加发送消息所需的权限
- 从"凭证"获取 **AppKey** 和 **AppSecret**
- 发布应用

**2. 配置**

```json
{
  "channels": {
    "dingtalk": {
      "enabled": true,
      "clientId": "YOUR_APP_KEY",
      "clientSecret": "YOUR_APP_SECRET",
      "allowFrom": ["YOUR_STAFF_ID"]
    }
  }
}
```

**3. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Slack</b></summary>

使用 **Socket 模式** — 无需公网 URL。

**1. 创建 Slack 应用**
- 访问 [Slack API](https://api.slack.com/apps) → **Create New App** → "From scratch"
- 选择名称并选择你的工作区

**2. 配置应用**
- **Socket Mode**：开启 → 生成 **App-Level Token**（`xapp-...`）
- **OAuth & Permissions**：添加 bot 作用域：`chat:write`、`app_mentions:read`
- **Event Subscriptions**：开启 → 订阅 bot 事件：`message.im`、`message.channels`、`app_mention`
- **Install App**：点击 **Install to Workspace** → 复制 **Bot Token**（`xoxb-...`）

**3. 配置**

```json
{
  "channels": {
    "slack": {
      "enabled": true,
      "botToken": "xoxb-...",
      "appToken": "xapp-...",
      "allowFrom": ["YOUR_SLACK_USER_ID"],
      "groupPolicy": "mention"
    }
  }
}
```

**4. 运行**

```bash
nanocats gateway
```

</details>

## ⚙️ 配置

配置文件：`~/.nanocats/config.json`

### 提供商

| 提供商 | 用途 | 获取 API Key |
|----------|---------|-------------|
| `custom` | 任何 OpenAI 兼容端点 | — |
| `openrouter` | LLM（推荐，可访问所有模型） | [openrouter.ai](https://openrouter.ai) |
| `anthropic` | LLM（Claude 直连） | [console.anthropic.com](https://console.anthropic.com) |
| `openai` | LLM（GPT 直连） | [platform.openai.com](https://platform.openai.com) |
| `deepseek` | LLM（DeepSeek 直连） | [platform.deepseek.com](https://platform.deepseek.com) |
| `ollama` | LLM（本地，Ollama） | — |

### MCP（Model Context Protocol）

```json
{
  "tools": {
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
      }
    }
  }
}
```

### Agent Swarm 配置

```json
{
  "agents": {
    "swarm": {
      "enabled": true,
      "max_agents": 20,
      "default_agent_ttl": 3600
    }
  }
}
```

## 💻 CLI 参考

| 命令 | 描述 |
|---------|-------------|
| `nanocats onboard` | 初始化配置和工作区 |
| `nanocats agent -m "..."` | 与 agent 聊天 |
| `nanocats agent` | 交互式聊天模式 |
| `nanocats gateway` | 启动网关 |
| `nanocats web` | 启动 Web 界面 |
| `nanocats web --port 3000` | 在自定义端口启动 Web |
| `nanocats status` | 显示状态 |
| `nanocats swarm status` | 显示 Swarm 状态 |
| `nanocats swarm list` | 列出所有 Agent |
| `nanocats swarm create <id>` | 创建新 Agent |

## 📁 项目结构

```
nanocats/
├── agent/          # 🧠 核心 agent 逻辑
│   ├── loop.py     #    Agent 循环
│   ├── context.py  #    提示构建器
│   ├── memory.py   #    持久化内存
│   ├── skills.py   #    技能加载器
│   └── tools/      #    内置工具
├── swarm/          # 🤖 Agent Swarm
│   ├── manager.py  #    Swarm 管理器
│   ├── instance.py #    Agent 实例
│   ├── router.py   #    消息路由器
│   └── mcp_registry.py # MCP 注册中心
├── web/            # 🌐 Web 界面
│   ├── backend/    #    FastAPI 后端
│   └── frontend/   #    React 前端
├── skills/         # 🎯 内置技能
├── channels/       # 📱 聊天渠道集成
├── bus/            # 🚌 消息路由
├── cron/           # ⏰ 定时任务
├── providers/      # 🤖 LLM 提供商
├── session/        # 💬 对话会话
├── config/         # ⚙️ 配置
└── cli/            # 🖥️ 命令
```
