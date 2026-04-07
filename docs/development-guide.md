# nanocats-manager 开发指南

> 本文档是 nanocats-manager 项目的权威开发参考，后续所有迭代研发必须基于本指南进行。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈与架构](#2-技术栈与架构)
3. [nanobot 核心概念](#3-nanobot-核心概念)
4. [nanobot 配置参考](#4-nanobot-配置参考)
5. [nanobot CLI 命令](#5-nanobot-cli-命令)
6. [聊天渠道集成](#6-聊天渠道集成)
7. [记忆与 Dream 系统](#7-记忆与-dream-系统)
8. [Skills 技能系统](#8-skills-技能系统)
9. [定时任务（Cron）](#9-定时任务cron)
10. [工具与 MCP](#10-工具与-mcp)
11. [安全模型](#11-安全模型)
12. [多实例与部署](#12-多实例与部署)
13. [nanocats-manager 内部架构](#13-nanocats-manager-内部架构)
14. [REST API 设计规范](#14-rest-api-设计规范)
15. [功能扩展指南](#15-功能扩展指南)
16. [常见陷阱与注意事项](#16-常见陷阱与注意事项)

---

## 1. 项目概述

**nanocats-manager** 是 [nanobot](https://nanobot.wiki) 的可视化管理平台，提供：

- Agent 实例的创建、启停、配置管理
- 共享 Skills、MCP 配置的统一分发
- Agent 日志实时查看
- Workspace 文件编辑（SOUL.md、USER.md、MEMORY.md、HEARTBEAT.md 等）
- 定时任务（Cron）管理
- Manager/Member 角色体系与 Teams 功能
- 内置 REST API，供 Manager Agent 通过 `nanocats-manager-skill` 自动化管理

**底层平台：** nanobot v0.1.5  
**管理界面：** Next.js Web UI（运行于本地 `http://localhost:3000`）

---

## 2. 技术栈与架构

### 前端 / 服务端

| 层级 | 技术 |
|------|------|
| 框架 | Next.js（App Router，特殊版本，见下方注意） |
| UI | shadcn/ui + Tailwind CSS |
| 语言 | TypeScript |
| 运行环境 | Node.js（服务端渲染 + API Routes） |

> **重要**：本项目使用的 Next.js 版本存在破坏性变更，APIs、约定和文件结构可能与标准版本不同。
> **修改任何 Next.js 相关代码前，必须先阅读 `node_modules/next/dist/docs/` 中的相关指南**，注意弃用提示。

### 项目目录结构

```
nanocats-manager/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── agents/[id]/            # Agent 详情页（chat/config/cron/env/logs/memory/skills/workspace）
│   │   ├── api/                    # REST API Routes
│   │   │   ├── agents/             # Agent CRUD + 操作接口
│   │   │   ├── nanobot/            # nanobot 版本/更新
│   │   │   ├── open-folder/        # 打开文件夹
│   │   │   ├── openspace/          # OpenSpace Dashboard
│   │   │   └── shared-config/      # 共享配置（skills/mcp/members/apply）
│   │   ├── layout.tsx
│   │   └── page.tsx                # 首页（Agent 列表）
│   ├── components/                 # React 组件
│   ├── lib/
│   │   ├── types.ts                # 核心类型定义
│   │   ├── store.ts                # Agent 数据持久化 + 共享配置管理
│   │   ├── process-manager.ts      # nanobot 进程生命周期管理
│   │   ├── nanobot.ts              # nanobot 二进制文件发现与调用
│   │   ├── openspace-manager.ts    # OpenSpace 集成
│   │   └── utils.ts
│   ├── assets/skills/              # 内置技能资产
│   │   └── nanocats-manager-skill/ # Manager Skill（含 SKILL.md 和 nanocat-api.py）
│   └── types/
└── docs/
    └── development-guide.md        # 本文档
```

### 数据持久化

| 数据 | 路径 |
|------|------|
| Agent 注册表 | `~/.nanocats-manager/agents-store.json` |
| 共享配置目录 | `~/.nanocats-manager/shared-config/` |
| 共享 Skills | `~/.nanocats-manager/shared-config/skills/` |
| 共享 Skills 配置 | `~/.nanocats-manager/shared-config/skills.json` |
| 共享 MCP 配置 | `~/.nanocats-manager/shared-config/mcp.json` |
| CLI 操作日志 | `~/.nanocats-manager/logs/cli-commands.log` |
| Agent 工作目录 | `~/agents/.nanobot-{name}/` |

---

## 3. nanobot 核心概念

### 3.1 什么是 nanobot

nanobot 是一个本地运行的 AI Agent 框架，支持：
- 通过 `config.json` 配置模型、工具、渠道
- 通过 `nanobot gateway` 接入多个聊天平台（Telegram、Discord、飞书等）
- 通过 `nanobot serve` 提供 OpenAI 兼容 API
- 内置记忆系统（短期 + 长期 Dream）
- Cron 定时任务调度
- Skills 技能系统扩展

### 3.2 nanobot 安装路径（查找优先级）

nanocats-manager 按以下顺序查找 nanobot 二进制：

1. `NANOBOT_BIN` 环境变量（最高优先级）
2. `which nanobot`（PATH 中查找）
3. `~/.local/share/uv/tools/nanobot-ai/bin/nanobot`（uv 安装，优先）
4. `~/.local/bin/nanobot`
5. `/opt/homebrew/bin/nanobot`
6. `/usr/local/bin/nanobot`
7. `~/workspace/ai/nanobot/.venv/bin/nanobot`

如需指定路径，设置环境变量：
```bash
export NANOBOT_BIN=/path/to/nanobot
```

### 3.3 Agent 工作目录结构

每个 Agent 的工作目录遵循以下结构：

```
~/agents/.nanobot-{name}/           # Agent 根目录（configPath 的父目录）
├── config.json                     # nanobot 配置文件（configPath 即指向此文件）
├── .env                            # Agent 环境变量文件（nanocats-manager 管理）
└── workspace/                      # workspacePath 指向此目录
    ├── skills/                     # Agent 私有 Skills（可含符号链接）
    ├── SOUL.md                     # Agent 个性定义
    ├── USER.md                     # 用户档案
    ├── HEARTBEAT.md                # 心跳任务列表
    ├── memory/
    │   ├── MEMORY.md               # 项目知识库
    │   └── history.jsonl           # 对话历史归档
    └── cron/                       # Cron 任务数据
```

> **关键约定**：`agent.configPath` 已是完整的 `config.json` 文件路径（如 `~/agents/.nanobot-foo/config.json`），代码中**禁止在此基础上再次拼接 `/config.json`**。

---

## 4. nanobot 配置参考

nanobot 使用单个 `config.json` 文件（默认 `~/.nanobot/config.json`，nanocats-manager 创建的 Agent 使用 `~/agents/.nanobot-{name}/config.json`）。

### 4.1 完整配置结构

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-sonnet-4-6",
      "provider": "openrouter",
      "workspace": "~/.nanobot/workspace",
      "maxTokens": 8192,
      "contextWindowTokens": 65536,
      "temperature": 0.1,
      "maxToolIterations": 200,
      "maxToolResultChars": 16000,
      "providerRetryMode": "standard",
      "reasoningEffort": null,
      "timezone": "UTC",
      "dream": {
        "intervalH": 2,
        "modelOverride": null,
        "maxBatchSize": 20,
        "maxIterations": 10
      }
    }
  },
  "providers": {
    "openai": { "apiKey": "${OPENAI_API_KEY}" },
    "anthropic": { "apiKey": "${ANTHROPIC_API_KEY}" }
  },
  "channels": {
    "sendProgress": true,
    "sendToolHints": false,
    "sendMaxRetries": 3,
    "transcriptionProvider": "groq",
    "telegram": { "enabled": true, "token": "...", "allowFrom": ["..."] }
  },
  "tools": {
    "restrictToWorkspace": false,
    "exec": {
      "enable": true,
      "timeout": 60,
      "sandbox": ""
    },
    "web": {
      "enable": true,
      "search": {
        "provider": "duckduckgo",
        "maxResults": 5
      }
    },
    "mcpServers": {}
  },
  "api": {
    "host": "127.0.0.1",
    "port": 8900,
    "timeout": 120.0
  },
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "heartbeat": {
      "enabled": true,
      "intervalS": 1800
    }
  }
}
```

### 4.2 关键配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `agents.defaults.model` | LLM 模型（`provider/model` 格式） | `anthropic/claude-opus-4-5` |
| `agents.defaults.provider` | 提供方（建议显式设置，不用 `auto`） | `auto` |
| `agents.defaults.workspace` | Agent 工作目录 | `~/.nanobot/workspace` |
| `agents.defaults.maxToolIterations` | 每轮最大工具调用次数 | `200` |
| `agents.defaults.providerRetryMode` | `standard` 或 `persistent`（长任务用后者） | `standard` |
| `agents.defaults.reasoningEffort` | 思考链：`low/medium/high/null` | `null` |
| `agents.defaults.timezone` | IANA 时区，影响 Cron 调度 | `UTC` |
| `tools.restrictToWorkspace` | 限制文件操作仅在工作区内 | `false` |
| `tools.exec.timeout` | Shell 命令超时（秒，最大 600） | `60` |
| `gateway.port` | Gateway webhook 回调端口 | `18790` |

### 4.3 密钥管理（环境变量插值）

配置中使用 `${VAR}` 语法引用环境变量：
```json
{
  "providers": {
    "openai": { "apiKey": "${OPENAI_API_KEY}" }
  }
}
```

也可以用 `NANOBOT_` 前缀的环境变量直接覆盖配置（优先级高于 config.json）：
```bash
export NANOBOT_AGENTS__DEFAULTS__MODEL="openai/gpt-5"
export NANOBOT_API__PORT=9000
```

**Agent 的 `.env` 文件**由 nanocats-manager 管理，路径为 `~/agents/.nanobot-{name}/.env`，启动时由 process-manager 解析并注入到进程环境。

---

## 5. nanobot CLI 命令

### 5.1 常用命令

| 命令 | 说明 |
|------|------|
| `nanobot onboard` | 初始化 config.json 和工作区 |
| `nanobot onboard --wizard` | 引导式初始化 |
| `nanobot agent` | 交互式对话模式 |
| `nanobot agent -m "消息"` | 单次查询后退出 |
| `nanobot gateway` | 启动 Gateway（激活所有渠道 + 定时任务） |
| `nanobot gateway --config <path> --port <n>` | 指定配置文件和端口启动 |
| `nanobot serve` | 启动 OpenAI 兼容 API（默认 127.0.0.1:8900） |
| `nanobot status` | 健康检查 |
| `nanobot channels status` | 查看已启用渠道 |
| `nanobot channels login <name>` | 扫码登录（WhatsApp、WeChat） |

### 5.2 nanocats-manager 如何启动 Agent

```bash
# 实际执行的命令
{nanobot_path} gateway --config {agent.configPath} --port {agent.port}
```

- 工作目录（`cwd`）设置为 `agent.workspacePath`
- 环境变量来自 `agent.workspacePath/../.env`（即 `~/agents/.nanobot-{name}/.env`）
- 进程通过 `SIGTERM` → 3s → `SIGKILL` 优雅关闭

### 5.3 聊天内命令（在任意渠道可用）

| 命令 | 说明 |
|------|------|
| `/new` | 开始新对话，清除当前会话 |
| `/stop` | 取消当前任务 |
| `/restart` | 重启 nanobot 进程 |
| `/status` | 查看模型、Token 用量、运行时间 |
| `/dream` | 立即执行 Dream 记忆整合 |
| `/dream-log` | 查看最近 Dream 的 git diff |
| `/dream-log <sha>` | 查看指定 Dream 变更 |
| `/dream-restore` | 列出最近 Dream 记录 |
| `/dream-restore <sha>` | 回滚到指定记忆快照 |
| `/help` | 打印所有可用命令 |

---

## 6. 聊天渠道集成

nanocats-manager 管理 Agent 的 config.json，其中 `channels` 部分控制聊天渠道接入。

### 6.1 渠道配置通用结构

```json
{
  "channels": {
    "sendProgress": true,
    "sendToolHints": false,
    "sendMaxRetries": 3,
    "transcriptionProvider": "groq",
    "<platform>": {
      "enabled": true,
      "allowFrom": ["<user_id>"],
      "groupPolicy": "mention"
    }
  }
}
```

**`allowFrom` 安全规则（极重要）：**
- `[]` — 拒绝所有人（渠道启动但不响应）
- `["USER_ID"]` — 仅允许白名单用户（推荐）
- `["*"]` — 允许所有人（高危，Agent 有文件和命令执行权限）

**`groupPolicy` 选项：**
- `"mention"` — 仅在群组中被 @ 提及时响应（默认，推荐）
- `"open"` — 响应所有消息
- `"allowlist"` — 配合 `groupAllowFrom` 限制特定频道（Slack）

### 6.2 各平台配置速查

**Telegram**
```json
{
  "telegram": {
    "enabled": true,
    "token": "BOT_TOKEN",
    "allowFrom": ["USER_ID"],
    "groupPolicy": "mention",
    "streaming": true
  }
}
```

**飞书（Feishu）**
```json
{
  "feishu": {
    "enabled": true,
    "appId": "cli_xxx",
    "appSecret": "xxx",
    "allowFrom": ["ou_YOUR_OPEN_ID"],
    "groupPolicy": "mention",
    "streaming": true
  }
}
```
> 飞书需要权限：`im:message`、`im:message.p2p_msg:readonly`、`cardkit:card:write`（streaming 需要）

**钉钉（DingTalk）**
```json
{
  "dingtalk": {
    "enabled": true,
    "clientId": "APP_KEY",
    "clientSecret": "APP_SECRET",
    "allowFrom": ["STAFF_ID"]
  }
}
```

**Discord**
```json
{
  "discord": {
    "enabled": true,
    "token": "BOT_TOKEN",
    "allowFrom": ["USER_ID"],
    "groupPolicy": "mention"
  }
}
```

**WhatsApp**（需要 Node.js 18+，无需公网 IP）
```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": ["+1234567890"],
    "groupPolicy": "open"
  }
}
```
> 首次使用需运行 `nanobot channels login whatsapp` 扫码

**企业微信（WeCom）**（需安装 `pip install nanobot-ai[wecom]`）
```json
{
  "wecom": {
    "enabled": true,
    "botId": "BOT_ID",
    "secret": "BOT_SECRET",
    "allowFrom": ["USER_ID"]
  }
}
```

### 6.3 渠道禁用

设置 `"enabled": false` 即可临时禁用渠道，无需删除配置。

---

## 7. 记忆与 Dream 系统

### 7.1 记忆层级

| 层级 | 路径 | 说明 |
|------|------|------|
| 会话记忆 | 内存中 | 当前对话窗口，`/new` 后清除 |
| 历史归档 | `workspace/memory/history.jsonl` | 压缩后的历史摘要，每行一条 JSON |
| 个性 | `workspace/SOUL.md` | Agent 沟通风格、语气、语言偏好 |
| 用户档案 | `workspace/USER.md` | 用户个人信息、偏好、习惯 |
| 项目知识 | `workspace/memory/MEMORY.md` | 决策记录、架构选择、踩坑经验 |

### 7.2 Dream 自动整合

Dream 是异步的长期记忆整合机制，`nanobot gateway` 运行时定期执行：

1. **分析阶段**：读取最新历史条目，与当前记忆文件对比，识别新事实和过时内容
2. **编辑阶段**：精确更新 `SOUL.md`、`USER.md`、`MEMORY.md`（追加/修改/删除特定行，不重写整文件）
3. **版本记录**：每次 Dream 后 commit 到本地 git，可用 `/dream-log` 和 `/dream-restore` 查看/回滚

### 7.3 Dream 配置

```json
{
  "agents": {
    "defaults": {
      "dream": {
        "intervalH": 2,
        "modelOverride": "deepseek/deepseek-chat",
        "maxBatchSize": 20,
        "maxIterations": 10
      }
    }
  }
}
```

**最佳实践**：`modelOverride` 可设置为更经济的模型（如 deepseek-chat）来降低成本。

### 7.4 nanocats-manager 中的 Workspace 编辑

通过 `/agents/[id]/workspace` 页面，用户可以直接编辑：
- `AGENTS.md` — Agent 系统提示词补充
- `SOUL.md` — 个性配置
- `USER.md` — 用户档案
- `TOOLS.md` — 工具使用指南
- `HEARTBEAT.md` — 心跳任务列表

---

## 8. Skills 技能系统

### 8.1 Skills 目录结构

```
workspace/skills/
└── {skill-name}/
    └── SKILL.md          # 技能定义文件
```

每个技能是一个包含 `SKILL.md` 的目录。nanobot 启动时扫描并加载所有技能。

### 8.2 SKILL.md 格式规范

```markdown
---
name: skill-name
description: 一句话描述技能功能（用于 Agent 决定何时调用该技能）
requires: CLI: gh              # 可选：标明依赖
---

# Skill Title

具体使用说明、命令示例...
```

**description 编写规范**：
- 必须简洁精准，Agent 根据 description 决定是否加载此技能
- 描述功能而非实现（"检查天气预报" 而非 "使用 curl 调用 wttr.in"）
- 不超过 80 字符

### 8.3 内置技能

| 技能名 | 说明 | 依赖 |
|--------|------|------|
| `memory` | 记忆系统操作指南 | 无（始终加载） |
| `cron` | Cron 工具使用指南 | 无 |
| `github` | GitHub 操作（Issue、PR、Release） | `gh` CLI |
| `weather` | 天气查询（wttr.in） | `curl` |
| `summarize` | 长文本摘要 | 无 |
| `tmux` | tmux 会话管理 | `tmux` |

### 8.4 共享 Skills（nanocats-manager 特有）

nanocats-manager 支持将技能统一分发给所有 Manager/Member Agent：

**存储位置**：`~/.nanocats-manager/shared-config/skills/{skill-name}/`

**分发机制**：在每个 Agent 的 `workspace/skills/` 下创建符号链接指向共享 Skills 目录

**启用配置**：`~/.nanocats-manager/shared-config/skills.json`
```json
{
  "enabled": ["skill-a", "skill-b"]
}
```

**触发同步**：调用 `POST /api/shared-config/apply` 或通过 Manager Agent 调用 nanocats-manager-skill

### 8.5 nanocats-manager-skill（Manager Agent 的核心技能）

Manager 角色 Agent 会自动安装 `nanocats-manager-skill`，通过 REST API 管理所有 Agent：

```bash
# 端口自动发现（必须先探测）
for port in 3000 18789 8080; do
  nc -z -w1 127.0.0.1 $port 2>/dev/null && echo "Found: $port" && break
done

# 使用 nanocat-api.py 调用
python3 nanocat-api.py <port> list-agents
python3 nanocat-api.py <port> start-agent <name>
python3 nanocat-api.py <port> shared-config apply
```

---

## 9. 定时任务（Cron）

### 9.1 创建 Cron 任务

通过自然语言让 Agent 创建：
```
提醒我每天早上 9 点检查部署日志
每隔 30 分钟检查一次 GitHub 新 Issue
今天下午 3 点提醒我开会
```

### 9.2 三种调度模式

| 模式 | 说明 | 示例 |
|------|------|------|
| 间隔 | 每隔 N 秒重复执行 | 每 5 分钟 |
| Cron 表达式 | 标准 5 字段语法 | `0 9 * * 1-5`（工作日早 9 点） |
| 单次触发 | 指定时间执行一次后删除 | 今天下午 3 点 |

### 9.3 Cron 数据存储

Cron 任务数据存储在 `{workspacePath}/cron/`，`nanobot gateway` 重启后自动恢复。

### 9.4 心跳任务（HEARTBEAT.md）

Gateway 每 30 分钟检查一次 `workspace/HEARTBEAT.md`，按需执行其中列出的任务：

```markdown
## Periodic Tasks

- 检查天气并发送摘要
- 扫描 GitHub 新 Issue
```

心跳结果发送到最近活跃的聊天渠道。心跳配置：
```json
{
  "gateway": {
    "heartbeat": {
      "enabled": true,
      "intervalS": 1800
    }
  }
}
```

### 9.5 Cron 管理页面

nanocats-manager 通过 `/agents/[id]/cron` 页面展示和管理 Agent 的定时任务，核心日志接口：
- `GET /api/agents/[id]/cron/core-logs` — 获取 Cron 执行日志

---

## 10. 工具与 MCP

### 10.1 内置工具配置

```json
{
  "tools": {
    "restrictToWorkspace": false,
    "exec": {
      "enable": true,
      "timeout": 60,
      "sandbox": ""
    },
    "web": {
      "enable": true,
      "proxy": null,
      "search": {
        "provider": "duckduckgo",
        "apiKey": "",
        "maxResults": 5,
        "timeout": 30
      }
    },
    "ssrfWhitelist": []
  }
}
```

**`exec.sandbox`** 选项：
- `""` — 无沙箱（默认）
- `"bwrap"` — bubblewrap 沙箱（仅 Linux）

**搜索 Provider** 选项：`duckduckgo`、`brave`、`tavily`、`searxng`、`jina`

### 10.2 MCP 服务器配置

MCP（Model Context Protocol）服务器在 `tools.mcpServers` 中配置：

```json
{
  "tools": {
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
      },
      "MiniMax": {
        "command": "uvx",
        "args": ["minimax-mcp-server"],
        "env": {
          "MINIMAX_API_KEY": "${MINIMAX_API_KEY}"
        }
      }
    }
  }
}
```

### 10.3 共享 MCP 配置（nanocats-manager）

共享 MCP 存储在 `~/.nanocats-manager/shared-config/mcp.json`：
```json
{
  "mcpServers": {
    "shared-server": {
      "command": "uvx",
      "args": ["some-mcp-server"]
    }
  }
}
```

执行 `apply` 时，共享 MCP 会**追加**到每个 Agent 的 `config.json` 的 `tools.mcpServers` 中（不覆盖现有配置）。

### 10.4 SSRF 防护

默认情况下，nanobot 阻止 Agent 访问私有网络地址。如果需要允许（如 Tailscale 网络）：
```json
{
  "tools": {
    "ssrfWhitelist": ["100.64.0.0/10"]
  }
}
```

---

## 11. 安全模型

### 11.1 核心安全原则

- **`allowFrom` 白名单**：每个渠道必须配置，控制谁可以与 Agent 交互
- **`config.json` 不入版本控制**：包含 API Key、Token 等敏感信息
- **`restrictToWorkspace`**：生产环境建议开启，限制文件访问范围
- **`exec.sandbox`**：高风险场景使用 bwrap 沙箱（仅 Linux）

### 11.2 nanocats-manager 安全注意事项

- nanocats-manager 默认仅监听 `localhost:3000`，不应暴露到公网
- Agent 的 `.env` 文件存储敏感密钥，文件权限应限制为当前用户
- Manager Agent 通过 REST API 可控制所有 Agent，应谨慎设置其 `allowFrom`

### 11.3 渠道安全配置建议

| 场景 | `allowFrom` | `groupPolicy` |
|------|-------------|---------------|
| 个人使用 | `["YOUR_ID"]` | `"mention"` |
| 小团队 | `["ID1", "ID2"]` | `"mention"` |
| 公开服务（高危） | `["*"]` | `"mention"` |

---

## 12. 多实例与部署

### 12.1 nanocats-manager 多 Agent 端口分配

- 端口从 `18790` 开始递增分配
- 每个 Agent 使用独立端口运行 `nanobot gateway`
- 端口记录在 `agents-store.json` 中，重启后恢复
- 重复端口自动检测并修复（`scanAndLoadAgentsFromDisk`）

### 12.2 Agent 角色体系

| 角色 | 说明 | 特殊配置 |
|------|------|----------|
| `manager` | 管理者 Agent | 自动安装 `nanocats-manager-skill` |
| `member` | 成员 Agent | 自动创建共享 Skills 符号链接，接收共享 MCP |
| 无角色 | 普通 Agent | 无特殊处理 |

### 12.3 服务器部署建议

在服务器上长期运行 Agent 时：

1. **使用 `nanobot gateway`** 而非 `nanobot agent`（gateway 包含所有后台功能）
2. **使用 `providerRetryMode: "persistent"`**（长时任务更稳定）
3. **配置合理的 `dream.intervalH`**（建议 2-4 小时）
4. **反向代理**：如需从外部访问 webchat，通过 nginx/caddy 代理并加 HTTPS
5. **进程守护**：使用 systemd 或 supervisor 保持 Gateway 持续运行

```bash
# nanobot 部署服务示例（提供参考）
nanobot gateway --config ~/agents/.nanobot-prod/config.json --port 18790
```

### 12.4 Channel Plugin 扩展

nanobot 支持第三方渠道插件，通过 `nanobot plugins list` 查看已安装插件。

第三方插件安装：
```bash
pip install nanobot-ai-plugin-xxx
```

---

## 13. nanocats-manager 内部架构

### 13.1 核心数据模型

```typescript
// AgentInstance — Agent 核心数据结构（name 为主键）
interface AgentInstance {
  name: string;          // 主键，唯一标识
  configPath: string;    // 完整路径，如 ~/agents/.nanobot-foo/config.json
  workspacePath: string; // 完整路径，如 ~/agents/.nanobot-foo/workspace
  port: number;          // Gateway 端口（从 18790 开始）
  webchatPort?: number;  // Webchat 端口（可选）
  status: "running" | "stopped" | "error";
  pid?: number;          // 进程 ID（运行时有值）
  createdAt: string;     // ISO 8601 时间戳
  role?: "manager" | "member"; // Agent 角色
}
```

### 13.2 关键模块职责

**`src/lib/store.ts`** — 数据持久化层
- Agent 注册表 CRUD（JSON 文件）
- `.env` 文件读写
- 共享配置管理（Skills 符号链接、MCP 合并）
- 孤儿数据自动清理

**`src/lib/process-manager.ts`** — 进程生命周期
- Gateway 进程启停（spawn/SIGTERM/SIGKILL）
- 日志缓冲区（最近 1000 行）+ 历史日志持久化
- 环境变量加载（`.env` 文件 → 进程 env）
- 进程状态同步（PID 存活检查）
- CLI 操作日志（文件 + 内存缓冲）

**`src/lib/nanobot.ts`** — nanobot CLI 封装
- 二进制文件自动发现（带缓存）
- `nanobot onboard` 调用
- `nanobot --version` 查询

**`src/lib/types.ts`** — 类型定义（所有接口从此导出）

### 13.3 进程管理单例模式

ProcessManager 使用 `globalThis` 保存单例，防止 Next.js 热重载导致进程丢失：

```typescript
const globalForProcessManager = globalThis as unknown as {
  processManager: ProcessManager | undefined;
};

export const processManager =
  globalForProcessManager.processManager ?? new ProcessManager();

if (process.env.NODE_ENV !== "production") {
  globalForProcessManager.processManager = processManager;
}
```

**新增任何需要在 Next.js 热重载后保持状态的全局变量，都必须遵循此模式。**

### 13.4 日志实时推送（SSE）

实时日志通过 Server-Sent Events (SSE) 推送：
- `GET /api/agents/[id]/logs` — 订阅实时日志流
- 前端使用 `EventSource` 接收，`LogViewer` 组件渲染

---

## 14. REST API 设计规范

### 14.1 API 路由规范

所有 API 路由位于 `src/app/api/`，遵循 Next.js App Router 约定。

**路由结构**：
```
/api/agents                    GET（列表）POST（创建）
/api/agents/[id]               GET DELETE
/api/agents/[id]/start         POST
/api/agents/[id]/stop          POST
/api/agents/[id]/config        GET PUT
/api/agents/[id]/env           GET PUT
/api/agents/[id]/logs          GET（SSE 流）
/api/agents/[id]/workspace     GET PUT
/api/agents/[id]/skills        GET PUT
/api/agents/[id]/cron/core-logs GET
/api/shared-config/skills      GET POST
/api/shared-config/skills/[name] DELETE
/api/shared-config/mcp         GET PUT
/api/shared-config/members     GET
/api/shared-config/apply       POST
/api/nanobot/version           GET
/api/nanobot/update            POST
```

### 14.2 响应格式规范

**成功响应**：
```json
{ "data": { ... } }
// 或直接返回数据（已存在接口的格式，保持一致性）
```

**错误响应**：
```json
{ "error": "描述错误的字符串" }
```

**HTTP 状态码**：
- `200` — 成功
- `201` — 创建成功
- `400` — 请求参数错误
- `404` — 资源不存在
- `500` — 服务器内部错误

### 14.3 Agent ID 约定

URL 中的 `[id]` 参数使用 **Agent name**（不是 UUID），例如：
- `/api/agents/my-agent/start`
- `/api/agents/my-agent/config`

---

## 15. 功能扩展指南

### 15.1 新增 Agent 子页面

1. 在 `src/app/agents/[id]/` 下创建新目录（如 `new-feature/page.tsx`）
2. 在对应目录创建 `page.tsx`
3. 如需 API，在 `src/app/api/agents/[id]/new-feature/route.ts` 创建路由
4. 在面包屑或导航中添加链接

### 15.2 新增共享配置类型

参考 Skills 和 MCP 的实现模式：
1. 在 `store.ts` 中定义新的存储路径常量
2. 添加读写函数（`ensureXxx`、`getXxx`、`setXxx`）
3. 在 `applySharedConfigToAgent` 中实现分发逻辑
4. 在 `src/app/api/shared-config/` 下创建 API 路由
5. 在前端 Shared Config 页面添加管理 UI

### 15.3 新增渠道支持

当 nanobot 支持新渠道时，nanocats-manager 的 Agent 配置页（`/agents/[id]/config`）需要：
1. 在配置编辑器中添加新渠道的表单字段
2. 确保配置能正确写入 `config.json` 的 `channels.{platform}` 节点

### 15.4 新增 Skill 到共享库

1. 在 `~/.nanocats-manager/shared-config/skills/` 下创建 `{skill-name}/SKILL.md`
2. 通过 nanocats-manager UI 或 API 启用该 Skill
3. 执行 `apply` 将符号链接分发到所有 Agent

---

## 16. 常见陷阱与注意事项

### 16.1 configPath 路径错误（高频陷阱）

```typescript
// ❌ 错误：agent.configPath 已是完整路径
const configFilePath = path.join(agent.configPath, "config.json");

// ✅ 正确：直接使用
const configFilePath = agent.configPath;
```

### 16.2 Next.js API Routes 中的系统命令

在 Next.js API Routes 中调用系统命令时，`PATH` 可能不完整（不含用户环境）。

**解决方案**：
- 始终使用绝对路径（通过 `findNanobotBinary()` 发现）
- 使用 `execFile` 而非 `exec`（更安全，避免 shell 注入）
- 在候选路径列表中覆盖所有常见安装位置

### 16.3 进程状态与重启的一致性

Next.js 开发模式热重载后，`processManager` 单例会重置，但实际子进程仍在运行。这会导致状态不同步。

**处理方式**：
- 始终通过 `isProcessAlive(pid)` 校验实际进程状态
- `syncAllStatuses()` 在 API 响应前自动同步

### 16.4 符号链接创建失败

在某些文件系统（如 Windows/Docker 卷）上，`fs.symlinkSync` 可能失败。

**当前处理**：失败时记录错误日志，不抛出异常（允许部分失败）。

### 16.5 OpenSpace 路径配置

OpenSpace 功能涉及路径配置，路径必须来自实际环境（不可硬编码）。参考 `openspace-manager.ts` 的动态路径获取方式。

### 16.6 .env 文件加载机制

nanobot 本身通过 shell `source .env` 加载环境变量（要求文件在 `cwd` 下）。nanocats-manager 额外将 `.env` 内容解析并注入 spawn 的 `env` 对象，作为双重保障。

### 16.7 端口冲突

- nanocats-manager UI：`3000`（Next.js 默认）
- Agent Gateway 端口：从 `18790` 开始递增
- nanobot API 端口：`8900`（默认，不由 nanocats-manager 管理）
- nanobot Gateway 默认端口：`18790`（与 nanocats-manager 分配给第一个 Agent 的端口相同，注意避免冲突）

### 16.8 共享 Skill 路径语义

```
~/.nanocats-manager/shared-config/skills/{skill-name}/  →  真实文件
~/agents/.nanobot-{agent}/workspace/skills/{skill-name}  →  符号链接
```

删除共享 Skill 时，需要同时：
1. 删除 `shared-config/skills/{name}/` 目录
2. 删除所有 Agent 的 `workspace/skills/{name}` 符号链接
3. 从 `skills.json` 的 `enabled` 列表中移除

---

## 附录：nanobot 支持的模型提供方

| 提供方 | 配置键 | 说明 |
|--------|--------|------|
| OpenRouter | `openrouter` | 统一入口，支持所有主流模型 |
| Anthropic | `anthropic` | Claude 系列 |
| OpenAI | `openai` | GPT 系列 |
| Groq | `groq` | 高速推理 |
| DeepSeek | `deepseek` | 经济型模型 |
| Google | `google` | Gemini 系列 |

模型格式：`provider/model-name`，如 `anthropic/claude-sonnet-4-6`、`openai/gpt-5`。

---

*本文档基于 nanobot v0.1.5 + nanocats-manager 当前代码版本编写。nanobot API 如有更新，请及时同步本文档。*
