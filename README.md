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

> 🙏 **Based on [nanobot](https://github.com/HKUDS/nanobot)** — nanocats is built upon the excellent foundation of nanobot, extending it with multi-agent support and enhanced tool capabilities.

## ⚠️ Development Status

> **This project is currently in active development. Features may change, bugs may occur, and functionality is NOT guaranteed to be stable or complete. Use at your own risk.**

## Key Features

⚡️ **Ultra-Lightweight**: Minimal footprint, fast startup, low resource usage

💬 **Multi-Channel Support**: Connect to Telegram, Discord, Feishu, Slack, WhatsApp, DingTalk, QQ, Email, and more

🤖 **Multi-Agent System**: Support for multiple agent types (Admin, User, Specialized, Task) with independent configurations

🔧 **Flexible Tools**: Built-in tools for file operations, shell execution, web search, and MCP integration

🧠 **Memory System**: Persistent memory with automatic consolidation

📦 **Skills**: Extensible skill system for adding new capabilities

⏰ **Scheduled Tasks**: Cron-based task scheduling

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Chat Channels](#chat-channels)
- [Configuration](#configuration)
- [CLI Reference](#cli-reference)
- [Project Structure](#project-structure)

## Install

```bash
git clone https://github.com/Theembers/nanocats.git
cd nanocats
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

> [!NOTE]
> **On macOS with Homebrew Python**: Always activate the virtual environment before running nanocats commands:
> ```bash
> source .venv/bin/activate
> ```

## Quick Start

**1. Initialize**

```bash
nanocats onboard
```

**2. Configure**

Edit `~/.nanocats/config.json`:

```json
{
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-v1-xxx"
    }
  },
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-5",
      "provider": "openrouter"
    }
  }
}
```

**3. Start chatting**

```bash
# Interactive mode
nanocats agent

# Single message
nanocats agent -m "Hello"
```

**4. Connect to chat channels**

```bash
nanocats gateway
```

## Chat Channels

Connect nanocats to your favorite messaging platforms.

| Channel | Setup Required |
|---------|---------------|
| **Telegram** | Bot token from @BotFather |
| **Discord** | Bot token + Message Content intent |
| **Feishu** | App ID + App Secret |
| **DingTalk** | App Key + App Secret |
| **Slack** | Bot token + App-Level token |
| **WhatsApp** | QR code scan |
| **QQ** | App ID + App Secret |
| **Email** | IMAP/SMTP credentials |
| **Web** | WebSocket connection |

### Telegram Setup

1. Create a bot via @BotFather
2. Copy the bot token
3. Configure in `~/.nanocats/config.json` (main config):

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

4. Configure permissions in Agent config `~/.nanocats/agents/{agent_id}.json`:

```json
{
  "channels": {
    "configs": {
      "telegram": {
        "enabled": true,
        "allowFrom": ["YOUR_USER_ID"]
      }
    }
  }
}
```

### Discord Setup

1. Create an application at https://discord.com/developers/applications
2. Add a Bot and enable **MESSAGE CONTENT INTENT**
3. Copy the bot token and configure in main config:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN"
    }
  }
}
```

4. Configure permissions in Agent config:

```json
{
  "channels": {
    "configs": {
      "discord": {
        "enabled": true,
        "allowFrom": ["YOUR_USER_ID"]
      }
    }
  }
}
```

### Web Channel

The Web channel provides a WebSocket interface for browser-based chat:

**Main config** (`~/.nanocats/config.json`):
```json
{
  "channels": {
    "web": {
      "enabled": true,
      "host": "0.0.0.0",
      "port": 15751
    }
  }
}
```

**Agent config** (`~/.nanocats/agents/{agent_id}.json`):
```json
{
  "channels": {
    "configs": {
      "web": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    }
  }
}
```

Connect via WebSocket to `ws://localhost:15751/ws` with initial message containing `user_id`.

## Configuration

### Providers

Supported LLM providers:

| Provider | Description |
|----------|-------------|
| `openrouter` | Access to multiple models (recommended) |
| `anthropic` | Claude models |
| `openai` | GPT models |
| `deepseek` | DeepSeek models |
| `azure_openai` | Azure OpenAI |
| `ollama` | Local Ollama models |
| `custom` | Any OpenAI-compatible endpoint |
| `gemini` | Google Gemini models |
| `groq` | Groq models |
| `zhipu` | Zhipu AI (智谱 AI) |
| `dashscope` | Alibaba DashScope (通义千问) |
| `moonshot` | Moonshot AI (月之暗面) |
| `minimax` | MiniMax models |
| `vllm` | vLLM local deployment |
| `aihubmix` | AiHubMix API gateway |
| `siliconflow` | SiliconFlow (硅基流动) |
| `volcengine` | VolcEngine (火山引擎) |
| `volcengine_coding_plan` | VolcEngine Coding Plan |
| `byteplus` | BytePlus (火山引擎国际版) |
| `byteplus_coding_plan` | BytePlus Coding Plan |
| `openai_codex` | OpenAI Codex (OAuth) |
| `github_copilot` | GitHub Copilot (OAuth) |

### Agent Types

nanocats supports multiple agent types:

- **Admin**: Global session, single instance (session key: `global`)
- **User**: Per-user sessions with group support (session key: `user:{group_id}`)
- **Specialized**: Agent-specific sessions (session key: `agent:{agent_id}`)
- **Task**: Task-specific sessions (session key: `task:{agent_id}`)

#### User Agent Session Groups

For User type agents, you can configure session groups to group multiple chat IDs together:

```json
{
  "id": "myagent",
  "name": "My Agent",
  "type": "user",
  "channels": {
    "configs": {
      "telegram": {
        "enabled": true,
        "allowFrom": ["123456789"]
      },
      "discord": {
        "enabled": true,
        "allowFrom": ["channel_111", "channel_222"]
      }
    },
    "session_groups": [
      {
        "group_id": "work",
        "chat_ids": {
          "telegram": "123456789",
          "discord": "channel_111"
        }
      },
      {
        "group_id": "personal",
        "chat_ids": {
          "telegram": "987654321",
          "discord": "channel_222"
        }
      }
    ]
  }
}
```

With this config:
- Messages from `telegram:123456789` and `discord:channel_111` share the same session (work group)
- Messages from `telegram:987654321` and `discord:channel_222` share the same session (personal group)

### Tools

Built-in tools available to agents:

- **Filesystem**: Read, write, edit files; list directories
- **Shell**: Execute shell commands with timeout protection
- **Web Search**: Search the web using Brave, DuckDuckGo, or SearXNG
- **Web Fetch**: Fetch web page content
- **Message**: Send messages to chat channels
- **Cron**: Schedule and manage recurring tasks
- **Spawn**: Spawn background sub-agents for parallel task execution
- **MCP**: Integration with Model Context Protocol servers

### Skills

Skills extend agent capabilities. Built-in skills include:

- GitHub operations
- Cron job management
- Tmux session management
- Memory management
- Weather information
- Text summarization

### MCP Servers

Configure MCP servers in your agent config:

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

## CLI Reference

| Command | Description |
|---------|-------------|
| `nanocats onboard` | Initialize configuration and workspace |
| `nanocats agent` | Chat with the agent (interactive mode) |
| `nanocats agent -m "..."` | Send a single message |
| `nanocats gateway` | Start the gateway with all enabled channels |
| `nanocats status` | Show system status |
| `nanocats swarm status` | Show agent swarm status |
| `nanocats swarm create <id>` | Create a new agent |
| `nanocats channels status` | Show channel status |
| `nanocats channels login` | QR login for WhatsApp |

## Project Structure

```
nanocats/
├── agent/              # Core agent logic
│   ├── loop.py        # Main agent loop
│   ├── context.py     # Context building
│   ├── memory.py      # Persistent memory
│   └── tools/         # Built-in tools
├── channels/          # Chat channel integrations
│   ├── telegram.py
│   ├── discord.py
│   ├── feishu.py
│   └── ...
├── providers/         # LLM provider integrations
│   ├── litellm_provider.py
│   ├── custom_provider.py
│   └── ...
├── swarm/             # Multi-agent orchestration
├── bus/               # Message routing
├── cron/              # Scheduled tasks
├── session/           # Conversation sessions
├── config/            # Configuration management
└── cli/               # CLI commands
```

## License

MIT
