<div align="center">
  <img src="nanocats_logo.png" alt="nanocats" width="500">
  <h1>nanocats: Ultra-Lightweight Personal AI Assistant</h1>
  <p>
    <img src="https://img.shields.io/badge/python-≥3.11-blue" alt="Python">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </p>
  <p>
    <a href="./README_CN.md">🇨🇳 中文</a>
  </p>
</div>

> 🙏 **Based on [nanobot](https://github.com/HKUDS/nanobot)** — nanocats is built upon the excellent foundation of nanobot, extending it with Agent Swarm capabilities and multi-agent orchestration.

## 📢 News

- **2026-03-12** 🌐 Added Web interface with agent management, chat UI, token statistics, and logs viewer
- **2026-03-11** 🎉 Project initialized — Forked from nanobot, renamed to nanocats with Agent Swarm support

## Key Features

🤖 **Agent Swarm**: Hierarchical multi-agent system (Supervisor → User Agent → Task Agent)

🏢 **Independent Workspaces**: Each agent has its own isolated workspace

🔧 **Per-Agent MCP Configuration**: MCP servers installed centrally but configured per-agent

📱 **Per-Agent Channel Binding**: Each user agent can have independent channel configurations

🌐 **Web Interface**: Built-in web UI for agent management, chat, configuration, and monitoring

📊 **Token Analytics**: Track token usage, cache hits, and costs by agent/model/time

📝 **Activity Logs**: View model calls, MCP executions, skill usage, and tool invocations

⚡️ **Lightning Fast**: Minimal footprint means faster startup, lower resource usage, and quicker iterations

💎 **Easy-to-Use**: One-click to deploy and you're ready to go

## 🏗️ Architecture

<p align="center">
  <img src="nanocats_arch.png" alt="Architecture" width="800">
</p>

## Table of Contents

- [News](#-news)
- [Key Features](#key-features)
- [Architecture](#️-architecture)
- [Install](#-install)
- [Quick Start](#-quick-start)
- [Web Interface](#-web-interface)
- [Chat Apps](#-chat-apps)
- [Configuration](#️-configuration)
- [CLI Reference](#-cli-reference)
- [Project Structure](#-project-structure)

## 📦 Install

**Install from source** (latest features, recommended for development)

```bash
git clone https://github.com/Theembers/nanocats.git
cd nanocats
pip install -e .
```

**Install with web interface**

```bash
pip install -e ".[web]"
```

## 🚀 Quick Start

> [!TIP]
> Set your API key in `~/.nanocats/config.json`.
> Get API keys: [OpenRouter](https://openrouter.ai/keys) (Global)

**1. Initialize**

```bash
nanocats onboard
```

**2. Configure** (`~/.nanocats/config.json`)

*Set your API key*:
```json
{
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-v1-xxx"
    }
  }
}
```

*Set your model*:
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

**3. Chat**

```bash
nanocats agent
```

## 🌐 Web Interface

nanocats includes a built-in web interface for managing agents, chatting, and monitoring usage.

**Start the web server:**

```bash
nanocats web
```

**Access the interface:**

- 📱 Web UI: http://localhost:8080
- 📚 API Docs: http://localhost:8080/docs

**Features:**

| Feature | Description |
|---------|-------------|
| **Agent Login** | Login with your agent ID and token |
| **Chat Interface** | Chat with your agent in real-time |
| **Agent Config** | Configure personality, model, provider settings |
| **MCP/Skill Management** | Install and manage MCP servers and skills |
| **Token Statistics** | View token usage charts and tables by time/model/agent |
| **Activity Logs** | Monitor model calls, MCP, skill, and tool executions |

**Login:**

1. Agent ID: Your agent configuration ID (e.g., `test_agent`)
2. Token: Use `admin` for testing, or configure custom tokens in agent config

## 💬 Chat Apps

Connect the system to your favorite chat platform.

| Channel | What you need |
|---------|---------------|
| **Telegram** | Bot token from @BotFather |
| **Discord** | Bot token + Message Content intent |
| **Feishu** | App ID + App Secret |
| **DingTalk** | App Key + App Secret |
| **Slack** | Bot token + App-Level token |
| **Email** | IMAP/SMTP credentials |
| **WhatsApp** | QR code scan |
| **QQ** | App ID + App Secret |

<details>
<summary><b>Telegram</b> (Recommended)</summary>

**1. Create a bot**
- Open Telegram, search `@BotFather`
- Send `/newbot`, follow prompts
- Copy the token

**2. Configure**

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

**3. Run**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Discord</b></summary>

**1. Create a bot**
- Go to https://discord.com/developers/applications
- Create an application → Bot → Add Bot
- Copy the bot token

**2. Enable intents**
- In the Bot settings, enable **MESSAGE CONTENT INTENT**

**3. Configure**

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

**4. Run**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Feishu</b></summary>

Uses **WebSocket** long connection — no public IP required.

**1. Create a Feishu bot**
- Visit [Feishu Open Platform](https://open.feishu.cn/app)
- Create a new app → Enable **Bot** capability
- **Permissions**: Add `im:message` (send) and `im:message.p2p_msg:readonly` (receive)
- **Events**: Add `im.message.receive_v1` (receive messages)
  - Select **Long Connection** mode
- Get **App ID** and **App Secret** from "Credentials & Basic Info"
- Publish the app

**2. Configure**

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

**3. Run**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>DingTalk</b></summary>

Uses **Stream Mode** — no public IP required.

**1. Create a DingTalk bot**
- Visit [DingTalk Open Platform](https://open-dev.dingtalk.com/)
- Create a new app -> Add **Robot** capability
- **Configuration**: Toggle **Stream Mode** ON
- **Permissions**: Add necessary permissions for sending messages
- Get **AppKey** and **AppSecret** from "Credentials"
- Publish the app

**2. Configure**

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

**3. Run**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Slack</b></summary>

Uses **Socket Mode** — no public URL required.

**1. Create a Slack app**
- Go to [Slack API](https://api.slack.com/apps) → **Create New App** → "From scratch"
- Pick a name and select your workspace

**2. Configure the app**
- **Socket Mode**: Toggle ON → Generate an **App-Level Token** with `connections:write` scope
- **OAuth & Permissions**: Add bot scopes: `chat:write`, `app_mentions:read`
- **Event Subscriptions**: Toggle ON → Subscribe to bot events: `message.im`, `message.channels`, `app_mention`
- **Install App**: Click **Install to Workspace** → Copy the **Bot Token** (`xoxb-...`)

**3. Configure**

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

**4. Run**

```bash
nanocats gateway
```

</details>

## ⚙️ Configuration

Config file: `~/.nanocats/config.json`

### Providers

| Provider | Purpose | Get API Key |
|----------|---------|-------------|
| `custom` | Any OpenAI-compatible endpoint | — |
| `openrouter` | LLM (recommended, access to all models) | [openrouter.ai](https://openrouter.ai) |
| `anthropic` | LLM (Claude direct) | [console.anthropic.com](https://console.anthropic.com) |
| `openai` | LLM (GPT direct) | [platform.openai.com](https://platform.openai.com) |
| `deepseek` | LLM (DeepSeek direct) | [platform.deepseek.com](https://platform.deepseek.com) |
| `ollama` | LLM (local, Ollama) | — |

### MCP (Model Context Protocol)

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

### Agent Swarm Configuration

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

## 💻 CLI Reference

| Command | Description |
|---------|-------------|
| `nanocats onboard` | Initialize config & workspace |
| `nanocats agent -m "..."` | Chat with the agent |
| `nanocats agent` | Interactive chat mode |
| `nanocats gateway` | Start the gateway |
| `nanocats web` | Start the web interface |
| `nanocats web --port 3000` | Start web on custom port |
| `nanocats status` | Show status |
| `nanocats swarm status` | Show swarm status |
| `nanocats swarm list` | List all agents |
| `nanocats swarm create <id>` | Create a new agent |

## 📁 Project Structure

```
nanocats/
├── agent/          # 🧠 Core agent logic
│   ├── loop.py     #    Agent loop
│   ├── context.py  #    Prompt builder
│   ├── memory.py   #    Persistent memory
│   ├── skills.py   #    Skills loader
│   └── tools/      #    Built-in tools
├── swarm/          # 🤖 Agent Swarm
│   ├── manager.py  #    Swarm manager
│   ├── instance.py #    Agent instance
│   ├── router.py   #    Message router
│   └── mcp_registry.py # MCP registry
├── web/            # 🌐 Web Interface
│   ├── backend/    #    FastAPI backend
│   └── frontend/   #    React frontend
├── skills/         # 🎯 Bundled skills
├── channels/       # 📱 Chat channel integrations
├── bus/            # 🚌 Message routing
├── cron/           # ⏰ Scheduled tasks
├── providers/      # 🤖 LLM providers
├── session/        # 💬 Conversation sessions
├── config/         # ⚙️ Configuration
└── cli/            # 🖥️ Commands
```
