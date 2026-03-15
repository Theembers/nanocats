<div align="center">
  <img src="nanocats_logo.png" alt="nanocats" width="500">
  <h1>nanocats: 超轻量级个人 AI 助手</h1>
  <p>
    <img src="https://img.shields.io/badge/python-≥3.11-blue" alt="Python">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </p>
  <p>
    <a href="./README.md">🇺🇸 English</a>
  </p>
</div>

> 🙏 **基于 [nanobot](https://github.com/HKUDS/nanobot)** — nanocats 在 nanobot 的优秀基础上构建，扩展了多代理支持和完善的工具能力。

## ⚠️ 开发状态

> **本项目正在积极开发中。功能可能会变化，可能出现 bug，功能不保证稳定或完整。使用需自行承担风险。**

## 核心特性

⚡️ **超轻量级**: 极简代码，快速启动，低资源占用

💬 **多通道支持**: 支持 Telegram、Discord、飞书、Slack、WhatsApp、钉钉、QQ、邮件等

🤖 **多代理系统**: 支持多种代理类型 (Admin、User、Specialized、Task)，可独立配置

🔧 **灵活工具**: 内置文件操作、Shell 执行、网页搜索、MCP 集成等工具

🧠 **记忆系统**: 持久化记忆，支持自动整合

📦 **技能系统**: 可扩展的技能系统，添加新能力

⏰ **定时任务**: 基于 Cron 的任务调度

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [聊天通道](#聊天通道)
- [配置](#配置)
- [CLI 参考](#cli-参考)
- [项目结构](#项目结构)

## 安装

```bash
git clone https://github.com/Theembers/nanocats.git
cd nanocats
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

> [!NOTE]
> **macOS 使用 Homebrew Python**: 运行 nanocats 命令前需先激活虚拟环境:
> ```bash
> source .venv/bin/activate
> ```

## 快速开始

**1. 初始化**

```bash
nanocats onboard
```

**2. 配置**

编辑 `~/.nanocats/config.json`:

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

**3. 开始聊天**

```bash
# 交互模式
nanocats agent

# 单条消息
nanocats agent -m "你好"
```

**4. 连接聊天通道**

```bash
nanocats gateway
```

## 聊天通道

将 nanocats 连接到您喜爱的消息平台。

| 通道 | 需要配置 |
|------|---------|
| **Telegram** | 通过 @BotFather 获取 Bot Token |
| **Discord** | Bot Token + Message Content Intent |
| **飞书** | App ID + App Secret |
| **钉钉** | App Key + App Secret |
| **Slack** | Bot Token + App-Level Token |
| **WhatsApp** | QR 码扫描登录 |
| **QQ** | App ID + App Secret |
| **邮件** | IMAP/SMTP 凭证 |
| **Web** | WebSocket 连接 |

### Telegram 配置

1. 通过 @BotFather 创建机器人
2. 复制 Bot Token
3. 在 `~/.nanocats/config.json` 中配置:

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

### Discord 配置

1. 在 https://discord.com/developers/applications 创建应用
2. 添加机器人并启用 **MESSAGE CONTENT INTENT**
3. 复制 Bot Token 并配置:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN",
      "allowFrom": ["YOUR_USER_ID"]
    }
  }
}
```

### Web 通道

Web 通道提供基于浏览器的 WebSocket 聊天接口:

```json
{
  "channels": {
    "web": {
      "enabled": true,
      "host": "0.0.0.0",
      "port": 15751,
      "allowFrom": ["*"]
    }
  }
}
```

通过 WebSocket 连接到 `ws://localhost:15751/ws`，首次消息需包含 `user_id`。

## 配置

### 模型提供商

支持的 LLM 提供商:

| 提供商 | 说明 |
|--------|------|
| `openrouter` | 访问多种模型 (推荐) |
| `anthropic` | Claude 模型 |
| `openai` | GPT 模型 |
| `deepseek` | DeepSeek 模型 |
| `azure_openai` | Azure OpenAI |
| `ollama` | 本地 Ollama 模型 |
| `custom` | 任意 OpenAI 兼容端点 |
| `gemini` | Google Gemini 模型 |
| `groq` | Groq 模型 |
| `zhipu` | 智谱 AI |
| `dashscope` | 阿里云 DashScope (通义千问) |
| `moonshot` | Moonshot AI (月之暗面) |
| `minimax` | MiniMax 模型 |
| `vllm` | vLLM 本地部署 |
| `aihubmix` | AiHubMix API 网关 |
| `siliconflow` | 硅基流动 |
| `volcengine` | 火山引擎 |
| `volcengine_coding_plan` | 火山引擎 Coding Plan |
| `byteplus` | BytePlus (火山引擎国际版) |
| `byteplus_coding_plan` | BytePlus Coding Plan |
| `openai_codex` | OpenAI Codex (OAuth) |
| `github_copilot` | GitHub Copilot (OAuth) |

### 代理类型

nanocats 支持多种代理类型:

- **Admin**: 全局会话，单实例 (会话键: `global`)
- **User**: 按用户会话，支持分组 (会话键: `user:{group_id}`)
- **Specialized**: 按代理会话 (会话键: `agent:{agent_id}`)
- **Task**: 按任务会话 (会话键: `task:{agent_id}`)

#### User 代理会话分组

对于 User 类型代理，可以配置会话分组将多个聊天 ID 组合在一起:

```json
{
  "id": "myagent",
  "name": "My Agent",
  "type": "user",
  "channels": {
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

配置后:
- 来自 `telegram:123456789` 和 `discord:channel_111` 的消息共享同一会话 (work 分组)
- 来自 `telegram:987654321` 和 `discord:channel_222` 的消息共享同一会话 (personal 分组)

### 工具

内置可用的代理工具:

- **文件系统**: 读取、写入、编辑文件; 列出目录
- **Shell**: 执行 Shell 命令，带超时保护
- **网页搜索**: 使用 Brave、DuckDuckGo 或 SearXNG 搜索
- **网页获取**: 获取网页内容
- **消息**: 向聊天通道发送消息
- **定时任务**: 调度和管理周期性任务
- **子代理**: spawn 后台子代理并行执行任务
- **MCP**: 与 Model Context Protocol 服务器集成

### 技能

技能扩展代理能力。内置技能包括:

- GitHub 操作
- 定时任务管理
- Tmux 会话管理
- 记忆管理
- 天气信息
- 文本摘要

### MCP 服务器

在代理配置中配置 MCP 服务器:

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

## CLI 参考

| 命令 | 说明 |
|------|------|
| `nanocats onboard` | 初始化配置和工作空间 |
| `nanocats agent` | 与代理聊天 (交互模式) |
| `nanocat s agent -m "..."` | 发送单条消息 |
| `nanocats gateway` | 启动网关，包含所有启用的通道 |
| `nanocats status` | 显示系统状态 |
| `nanocats swarm status` | 显示代理集群状态 |
| `nanocats swarm create <id>` | 创建新代理 |
| `nanocats channels status` | 显示通道状态 |
| `nanocats channels login` | WhatsApp QR 登录 |

## 项目结构

```
nanocats/
├── agent/              # 核心代理逻辑
│   ├── loop.py        # 主代理循环
│   ├── context.py     # 上下文构建
│   ├── memory.py      # 持久化记忆
│   └── tools/         # 内置工具
├── channels/          # 聊天通道集成
│   ├── telegram.py
│   ├── discord.py
│   ├── feishu.py
│   └── ...
├── providers/         # LLM 提供商集成
│   ├── litellm_provider.py
│   ├── custom_provider.py
│   └── ...
├── swarm/             # 多代理编排
├── bus/               # 消息路由
├── cron/              # 定时任务
├── session/           # 对话会话
├── config/            # 配置管理
└── cli/               # CLI 命令
```

## 许可证

MIT
