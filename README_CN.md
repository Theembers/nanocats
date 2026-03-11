<div align="center">
  <img src="nanocats_logo.png" alt="nanocats" width="500">
  <h1>nanocats: 超轻量级个人 AI 助手</h1>
  <p>
    <a href="https://pypi.org/project/nanocats-ai/"><img src="https://img.shields.io/pypi/v/nanocats-ai" alt="PyPI"></a>
    <a href="https://pepy.tech/project/nanocats-ai"><img src="https://static.pepy.tech/badge/nanocats-ai" alt="Downloads"></a>
    <img src="https://img.shields.io/badge/python-≥3.11-blue" alt="Python">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    <a href="./COMMUNICATION.md"><img src="https://img.shields.io/badge/Feishu-Group-E9DBFC?style=flat&logo=feishu&logoColor=white" alt="Feishu"></a>
    <a href="./COMMUNICATION.md"><img src="https://img.shields.io/badge/WeChat-Group-C5EAB4?style=flat&logo=wechat&logoColor=white" alt="WeChat"></a>
    <a href="https://discord.gg/MnCvHqpUGB"><img src="https://img.shields.io/badge/Discord-Community-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord"></a>
  </p>
</div>

> 🙏 **基于 [nanobot](https://github.com/HKUDS/nanobot) 开发** — nanocats 构建在优秀的 nanobot 基础之上，扩展了 Agent Swarm 能力和多智能体编排功能。
>
> 本项目继承了 nanobot 的所有核心功能，并新增：
> - 🤖 **Agent Swarm**: 层级式多智能体系统（Supervisor → User Agent → Task Agent）
> - 🏢 **独立工作空间**: 每个 Agent 拥有隔离的工作空间
> - 🔧 **Agent 级 MCP 配置**: MCP 服务器统一安装，但支持按 Agent 独立配置
> - 📱 **Agent 级渠道绑定**: 每个用户 Agent 可拥有独立的通讯渠道配置

🐈 **nanocats** 是一个**超轻量级**的个人 AI 助手，灵感来源于 [OpenClaw](https://github.com/openclaw/openclaw)。

⚡️ 以比 OpenClaw **少 99% 的代码量**实现核心 Agent 功能。

📏 实时代码行数统计：运行 `bash core_agent_lines.sh` 随时验证。

## 📢 新闻

- **2026-03-08** 🚀 发布 **v0.1.4.post4** — 一个注重可靠性的版本，包含更安全的默认设置、更好的多实例支持、更稳健的 MCP，以及重要的渠道和提供商改进。详情请查看 [发布说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.4.post4)。
- **2026-03-07** 🚀 Azure OpenAI 提供商、WhatsApp 媒体支持、QQ 群聊，以及更多 Telegram/飞书 优化。
- **2026-03-06** 🪄 更轻量的提供商、更智能的媒体处理，以及更稳健的内存和 CLI 兼容性。
- **2026-03-05** ⚡️ Telegram 草稿流式输出、MCP SSE 支持，以及更广泛的渠道可靠性修复。
- **2026-03-04** 🛠️ 依赖清理、更安全的文件读取，以及又一轮测试和 Cron 修复。
- **2026-03-03** 🧠 更清晰的用户消息合并、更安全的多模态保存，以及更强的 Cron 防护。
- **2026-03-02** 🛡️ 更安全的默认访问控制、更稳健的 Cron 重载，以及更清晰的 Matrix 媒体处理。
- **2026-03-01** 🌐 Web 代理支持、更智能的 Cron 提醒，以及飞书富文本解析改进。
- **2026-02-28** 🚀 发布 **v0.1.4.post3** — 更清晰的上下文、更稳健的会话历史，以及更智能的 agent。详情请查看 [发布说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.4.post3)。
- **2026-02-27** 🧠 实验性思考模式支持、钉钉媒体消息、飞书和 QQ 渠道修复。
- **2026-02-26** 🛡️ 会话投毒修复、WhatsApp 去重、Windows 路径防护、Mistral 兼容性。

<details>
<summary>更早的新闻</summary>

- **2026-02-25** 🧹 新增 Matrix 渠道、更清晰的会话上下文、自动工作区模板同步。
- **2026-02-24** 🚀 发布 **v0.1.4.post2** — 一个注重可靠性的版本，包含重新设计的心跳机制、提示缓存优化，以及更稳健的提供商和渠道稳定性。详情请查看 [发布说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.4.post2)。
- **2026-02-23** 🔧 虚拟工具调用心跳、提示缓存优化、Slack mrkdwn 修复。
- **2026-02-22** 🛡️ Slack 线程隔离、Discord 输入指示器修复、agent 可靠性改进。
- **2026-02-21** 🎉 发布 **v0.1.4.post1** — 新提供商、跨渠道媒体支持，以及重大稳定性改进。详情请查看 [发布说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.4.post1)。
- **2026-02-20** 🐦 飞书现已支持接收用户发送的多模态文件。底层内存更可靠。
- **2026-02-19** ✨ Slack 现可发送文件、Discord 分割长消息、子代理在 CLI 模式下可用。
- **2026-02-18** ⚡️ nanocats 现支持火山引擎、MCP 自定义认证头、Anthropic 提示缓存。
- **2026-02-17** 🎉 发布 **v0.1.4** — MCP 支持、进度流式输出、新提供商，以及多渠道改进。详情请查看 [发布说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.4)。
- **2026-02-16** 🦞 nanocats 现集成 [ClawHub](https://clawhub.ai) 技能 — 搜索并安装公开的 agent 技能。
- **2026-02-15** 🔑 nanocats 现支持 OpenAI Codex 提供商，支持 OAuth 登录。
- **2026-02-14** 🔌 nanocats 现支持 MCP！详情请查看 [MCP 章节](#mcp-model-context-protocol)。
- **2026-02-13** 🎉 发布 **v0.1.3.post7** — 包含安全加固和多项改进。**请升级到最新版本以解决安全问题**。详情请查看 [发布说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.3.post7)。
- **2026-02-12** 🧠 重新设计的内存系统 — 更少代码，更可靠。欢迎参与 [讨论](https://github.com/HKUDS/nanocats/discussions/566)！
- **2026-02-11** ✨ 增强版 CLI 体验，新增 MiniMax 支持！
- **2026-02-10** 🎉 发布 **v0.1.3.post6** 及多项改进！查看 [更新说明](https://github.com/HKUDS/nanocats/releases/tag/v0.1.3.post6) 和我们的 [路线图](https://github.com/HKUDS/nanocats/discussions/431)。
- **2026-02-09** 💬 新增 Slack、Email 和 QQ 支持 — nanocats 现支持多个聊天平台！
- **2026-02-08** 🔧 重构 Providers — 现在添加新的 LLM 提供商只需 2 个简单步骤！查看 [这里](#providers)。
- **2026-02-07** 🚀 发布 **v0.1.3.post5**，支持通义千问及多项关键改进！详情请查看 [这里](https://github.com/HKUDS/nanocats/releases/tag/v0.1.3.post5)。
- **2026-02-06** ✨ 新增 Moonshot/Kimi 提供商、Discord 集成，以及增强的安全加固！
- **2026-02-05** ✨ 新增飞书渠道、DeepSeek 提供商，以及增强的定时任务支持！
- **2026-02-04** 🚀 发布 **v0.1.3.post4**，支持多提供商和 Docker！详情请查看 [这里](https://github.com/HKUDS/nanocats/releases/tag/v0.1.3.post4)。
- **2026-02-03** ⚡ 集成 vLLM 支持本地 LLM，改进自然语言任务调度！
- **2026-02-02** 🎉 nanocats 正式发布！欢迎体验 🐈 nanocats！

</details>

## nanocats 核心特性

🪶 **超轻量级**：仅约 4,000 行核心 agent 代码 — 比 Clawdbot 小 99%。

🔬 **研究就绪**：清晰、可读的代码，易于理解、修改和扩展，非常适合研究使用。

⚡️ **极速响应**：极小的代码量意味着更快的启动速度、更低的资源占用和更快的迭代周期。

💎 **易于使用**：一键部署，即刻上手。

## 🏗️ 架构

<p align="center">
  <img src="nanocats_arch.png" alt="nanocats 架构" width="800">
</p>

## 目录

- [新闻](#-新闻)
- [核心特性](#nanocats-核心特性)
- [架构](#️-架构)
- [功能展示](#-功能展示)
- [安装](#-安装)
- [快速开始](#-快速开始)
- [聊天应用](#-聊天应用)
- [Agent 社交网络](#-agent-社交网络)
- [配置](#️-配置)
- [多实例](#-多实例)
- [CLI 参考](#-cli-参考)
- [Docker](#-docker)
- [Linux 服务](#-linux-服务)
- [项目结构](#-项目结构)
- [贡献与路线图](#-贡献与路线图)
- [Star 历史](#-star-历史)

## ✨ 功能展示

<table align="center">
  <tr align="center">
    <th><p align="center">📈 24/7 实时市场分析</p></th>
    <th><p align="center">🚀 全栈软件工程师</p></th>
    <th><p align="center">📅 智能日程管理</p></th>
    <th><p align="center">📚 个人知识助手</p></th>
  </tr>
  <tr>
    <td align="center"><p align="center"><img src="case/search.gif" width="180" height="400"></p></td>
    <td align="center"><p align="center"><img src="case/code.gif" width="180" height="400"></p></td>
    <td align="center"><p align="center"><img src="case/scedule.gif" width="180" height="400"></p></td>
    <td align="center"><p align="center"><img src="case/memory.gif" width="180" height="400"></p></td>
  </tr>
  <tr>
    <td align="center">发现 · 洞察 · 趋势</td>
    <td align="center">开发 · 部署 · 扩展</td>
    <td align="center">日程 · 自动化 · 组织</td>
    <td align="center">学习 · 记忆 · 推理</td>
  </tr>
</table>

## 📦 安装

**从源码安装**（最新功能，推荐开发使用）

```bash
git clone https://github.com/HKUDS/nanocats.git
cd nanocats
pip install -e .
```

**使用 [uv](https://github.com/astral-sh/uv) 安装**（稳定版，速度快）

```bash
uv tool install nanocats-ai
```

**从 PyPI 安装**（稳定版）

```bash
pip install nanocats-ai
```

### 更新到最新版本

**PyPI / pip**

```bash
pip install -U nanocats-ai
nanocats --version
```

**uv**

```bash
uv tool upgrade nanocats-ai
nanocats --version
```

**使用 WhatsApp？** 升级后需要重建本地桥接：

```bash
rm -rf ~/.nanocats/bridge
nanocats channels login
```

## 🚀 快速开始

> [!TIP]
> 在 `~/.nanocats/config.json` 中设置你的 API 密钥。
> 获取 API 密钥：[OpenRouter](https://openrouter.ai/keys)（全球）· [Brave Search](https://brave.com/search/api/)（可选，用于网页搜索）

**1. 初始化**

```bash
nanocats onboard
```

**2. 配置**（`~/.nanocats/config.json`）

将以下**两部分**添加或合并到你的配置中（其他选项使用默认值）。

*设置 API 密钥*（例如 OpenRouter，推荐全球用户使用）：
```json
{
  "providers": {
    "openrouter": {
      "apiKey": "sk-or-v1-xxx"
    }
  }
}
```

*设置模型*（可选：指定提供商 — 默认为自动检测）：
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

就是这么简单！2 分钟内你就有了一个可用的 AI 助手。

## 💬 聊天应用

将 nanocats 连接到你喜欢的聊天平台。

| 渠道 | 所需信息 |
|---------|---------------|
| **Telegram** | 来自 @BotFather 的 Bot token |
| **Discord** | Bot token + Message Content intent |
| **WhatsApp** | 扫描二维码 |
| **飞书** | App ID + App Secret |
| **Mochat** | Claw token（支持自动设置） |
| **钉钉** | App Key + App Secret |
| **Slack** | Bot token + App-Level token |
| **Email** | IMAP/SMTP 凭证 |
| **QQ** | App ID + App Secret |
| **企业微信** | Bot ID + Bot Secret |

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

> 你可以在 Telegram 设置中找到你的 **User ID**。它显示为 `@yourUserId`。
> 复制这个值**不带 `@` 符号**，然后粘贴到配置文件中。


**3. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Mochat (Claw IM)</b></summary>

默认使用 **Socket.IO WebSocket**，支持 HTTP 轮询回退。

**1. 让 nanocats 为你设置 Mochat**

只需向 nanocats 发送以下消息（将 `xxx@xxx` 替换为你的真实邮箱）：

```
Read https://raw.githubusercontent.com/HKUDS/MoChat/refs/heads/main/skills/nanocats/skill.md and register on MoChat. My Email account is xxx@xxx Bind me as your owner and DM me on MoChat.
```

nanocats 将自动注册、配置 `~/.nanocats/config.json`，并连接到 Mochat。

**2. 重启网关**

```bash
nanocats gateway
```

就是这么简单 — nanocats 会处理剩下的工作！

<br>

<details>
<summary>手动配置（高级）</summary>

如果你更喜欢手动配置，请在 `~/.nanocats/config.json` 中添加以下内容：

> 保持 `claw_token` 私密。它只能通过 `X-Claw-Token` 头发送到你的 Mochat API 端点。

```json
{
  "channels": {
    "mochat": {
      "enabled": true,
      "base_url": "https://mochat.io",
      "socket_url": "https://mochat.io",
      "socket_path": "/socket.io",
      "claw_token": "claw_xxx",
      "agent_user_id": "6982abcdef",
      "sessions": ["*"],
      "panels": ["*"],
      "reply_delay_mode": "non-mention",
      "reply_delay_ms": 120000
    }
  }
}
```



</details>

</details>

<details>
<summary><b>Discord</b></summary>

**1. 创建机器人**
- 访问 https://discord.com/developers/applications
- 创建应用 → Bot → Add Bot
- 复制机器人 token

**2. 启用 intents**
- 在 Bot 设置中，启用 **MESSAGE CONTENT INTENT**
- （可选）如果计划使用基于成员数据的允许列表，启用 **SERVER MEMBERS INTENT**

**3. 获取你的 User ID**
- Discord 设置 → 高级 → 启用 **开发者模式**
- 右键点击你的头像 → **复制用户 ID**

**4. 配置**

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

> `groupPolicy` 控制机器人在群频道中的响应方式：
> - `"mention"`（默认）— 仅在被 @提及时响应
> - `"open"` — 响应所有消息
> DM 总是响应，只要发送者在 `allowFrom` 中。

**5. 邀请机器人**
- OAuth2 → URL Generator
- Scopes: `bot`
- Bot 权限: `Send Messages`, `Read Message History`
- 打开生成的邀请链接并将机器人添加到你的服务器

**6. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>Matrix (Element)</b></summary>

首先安装 Matrix 依赖：

```bash
pip install nanocats-ai[matrix]
```

**1. 创建/选择 Matrix 账户**

- 在你的主服务器（例如 `matrix.org`）上创建或复用一个 Matrix 账户。
- 确认你可以用 Element 登录。

**2. 获取凭证**

- 你需要：
  - `userId`（例如：`@nanocats:matrix.org`）
  - `accessToken`
  - `deviceId`（推荐，以便在重启之间恢复同步令牌）
- 你可以从主服务器登录 API（`/_matrix/client/v3/login`）或从客户端的高级会话设置中获取这些信息。

**3. 配置**

```json
{
  "channels": {
    "matrix": {
      "enabled": true,
      "homeserver": "https://matrix.org",
      "userId": "@nanocats:matrix.org",
      "accessToken": "syt_xxx",
      "deviceId": "NANOBOT01",
      "e2eeEnabled": true,
      "allowFrom": ["@your_user:matrix.org"],
      "groupPolicy": "open",
      "groupAllowFrom": [],
      "allowRoomMentions": false,
      "maxMediaBytes": 20971520
    }
  }
}
```

> 保持持久的 `matrix-store` 和稳定的 `deviceId` — 如果这些在重启之间发生变化，加密会话状态将丢失。

| 选项 | 描述 |
|--------|-------------|
| `allowFrom` | 允许交互的用户 ID。空表示拒绝所有；使用 `["*"]` 允许所有人。 |
| `groupPolicy` | `open`（默认）、`mention` 或 `allowlist`。 |
| `groupAllowFrom` | 房间白名单（当策略为 `allowlist` 时使用）。 |
| `allowRoomMentions` | 在提及模式下接受 `@room` 提及。 |
| `e2eeEnabled` | E2EE 支持（默认 `true`）。设为 `false` 表示仅明文。 |
| `maxMediaBytes` | 最大附件大小（默认 `20MB`）。设为 `0` 阻止所有媒体。 |




**4. 运行**

```bash
nanocats gateway
```

</details>

<details>
<summary><b>WhatsApp</b></summary>

需要 **Node.js ≥18**。

**1. 关联设备**

```bash
nanocats channels login
# 用 WhatsApp 扫描二维码 → 设置 → 已关联的设备
```

**2. 配置**

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allowFrom": ["+1234567890"]
    }
  }
}
```

**3. 运行**（两个终端）

```bash
# 终端 1
nanocats channels login

# 终端 2
nanocats gateway
```

> WhatsApp 桥接更新不会自动应用于现有安装。
> 升级 nanocats 后，使用以下命令重建本地桥接：
> `rm -rf ~/.nanocats/bridge && nanocats channels login`

</details>

<details>
<summary><b>飞书</b></summary>

使用 **WebSocket** 长连接 — 无需公网 IP。

**1. 创建飞书机器人**
- 访问 [飞书开放平台](https://open.feishu.cn/app)
- 创建新应用 → 启用 **机器人** 能力
- **权限**：添加 `im:message`（发送消息）和 `im:message.p2p_msg:readonly`（接收消息）
- **事件**：添加 `im.message.receive_v1`（接收消息）
  - 选择 **长连接** 模式（需要先运行 nanocats 建立连接）
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
      "encryptKey": "",
      "verificationToken": "",
      "allowFrom": ["ou_YOUR_OPEN_ID"]
    }
  }
}
```

> `encryptKey` 和 `verificationToken` 对于长连接模式是可选的。
> `allowFrom`：添加你的 open_id（当你给机器人发消息时可以在 nanocats 日志中找到）。使用 `["*"]` 允许所有用户。

**3. 运行**

```bash
nanocats gateway
```

> [!TIP]
> 飞书使用 WebSocket 接收消息 — 不需要 webhook 或公网 IP！

</details>

<details>
<summary><b>QQ（QQ单聊）</b></summary>

使用 **botpy SDK** 和 WebSocket — 无需公网 IP。目前仅支持**私聊消息**。

**1. 注册并创建机器人**
- 访问 [QQ 开放平台](https://q.qq.com) → 注册为开发者（个人或企业）
- 创建新的机器人应用
- 进入 **开发设置** → 复制 **AppID** 和 **AppSecret**

**2. 设置沙箱进行测试**
- 在机器人管理控制台中，找到 **沙箱配置**
- 在 **在消息列表配置** 下，点击 **添加成员** 并添加你自己的 QQ 号
- 添加后，用手机 QQ 扫描机器人的二维码 → 打开机器人资料页 → 点击"发消息"开始聊天

**3. 配置**

> - `allowFrom`：添加你的 openid（当你给机器人发消息时可以在 nanocats 日志中找到）。使用 `["*"]` 允许公开访问。
> - 生产环境：在机器人控制台提交审核并发布。完整发布流程请参见 [QQ 机器人文档](https://bot.q.qq.com/wiki/)。

```json
{
  "channels": {
    "qq": {
      "enabled": true,
      "appId": "YOUR_APP_ID",
      "secret": "YOUR_APP_SECRET",
      "allowFrom": ["YOUR_OPENID"]
    }
  }
}
```

**4. 运行**

```bash
nanocats gateway
```

现在从 QQ 给机器人发送消息 — 它应该会回复！

</details>

<details>
<summary><b>钉钉</b></summary>

使用 **Stream 模式** — 无需公网 IP。

**1. 创建钉钉机器人**
- 访问 [钉钉开放平台](https://open-dev.dingtalk.com/)
- 创建新应用 → 添加 **机器人** 能力
- **配置**：
  - 开启 **Stream 模式**
- **权限**：添加发送消息所需的权限
- 从"凭证"获取 **AppKey**（Client ID）和 **AppSecret**（Client Secret）
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

> `allowFrom`：添加你的员工 ID。使用 `["*"]` 允许所有用户。

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
- **Socket Mode**：开启 → 生成一个具有 `connections:write` 作用域的 **App-Level Token** → 复制它（`xapp-...`）
- **OAuth & Permissions**：添加 bot 作用域：`chat:write`、`reactions:write`、`app_mentions:read`
- **Event Subscriptions**：开启 → 订阅 bot 事件：`message.im`、`message.channels`、`app_mention` → 保存更改
- **App Home**：滚动到 **Show Tabs** → 启用 **Messages Tab** → 勾选 **"Allow users to send Slash commands and messages from the messages tab"**
- **Install App**：点击 **Install to Workspace** → 授权 → 复制 **Bot Token**（`xoxb-...`）

**3. 配置 nanocats**

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

直接给机器人发 DM 或在频道中 @提及它 — 它应该会回复！

> [!TIP]
> - `groupPolicy`：`"mention"`（默认 — 仅在被 @提及时响应）、`"open"`（响应所有频道消息）或 `"allowlist"`（限制到特定频道）。
> - DM 策略默认为开放。设置 `"dm": {"enabled": false}` 可禁用 DM。

</details>

<details>
<summary><b>Email</b></summary>

给 nanocats 一个专属邮箱账户。它通过 **IMAP** 轮询收件邮件，通过 **SMTP** 回复 — 就像一个私人邮件助手。

**1. 获取凭证（以 Gmail 为例）**
- 为你的机器人创建一个专用 Gmail 账户（例如 `my-nanocats@gmail.com`）
- 启用两步验证 → 创建一个 [应用专用密码](https://myaccount.google.com/apppasswords)
- 将此应用密码用于 IMAP 和 SMTP

**2. 配置**

> - `consentGranted` 必须为 `true` 才能允许邮箱访问。这是一个安全门 — 设为 `false` 可完全禁用。
> - `allowFrom`：添加你的邮箱地址。使用 `["*"]` 接受任何人的邮件。
> - `smtpUseTls` 和 `smtpUseSsl` 默认分别为 `true` / `false`，这对 Gmail（端口 587 + STARTTLS）是正确的。无需显式设置。
> - 如果你只想读取/分析邮件而不发送自动回复，设置 `"autoReplyEnabled": false`。

```json
{
  "channels": {
    "email": {
      "enabled": true,
      "consentGranted": true,
      "imapHost": "imap.gmail.com",
      "imapPort": 993,
      "imapUsername": "my-nanocats@gmail.com",
      "imapPassword": "your-app-password",
      "smtpHost": "smtp.gmail.com",
      "smtpPort": 587,
      "smtpUsername": "my-nanocats@gmail.com",
      "smtpPassword": "your-app-password",
      "fromAddress": "my-nanocats@gmail.com",
      "allowFrom": ["your-real-email@gmail.com"]
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
<summary><b>企业微信</b></summary>

> 这里我们使用 [wecom-aibot-sdk-python](https://github.com/chengyongru/wecom_aibot_sdk)（官方 [@wecom/aibot-node-sdk](https://www.npmjs.com/package/@wecom/aibot-node-sdk) 的社区 Python 版本）。
>
> 使用 **WebSocket** 长连接 — 无需公网 IP。

**1. 安装可选依赖**

```bash
pip install nanocats-ai[wecom]
```

**2. 创建企业微信 AI 机器人**

进入企业微信管理后台 → 智能机器人 → 创建机器人 → 选择 **API 模式**并选择**长连接**。复制机器人 ID 和 Secret。

**3. 配置**

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "botId": "your_bot_id",
      "secret": "your_bot_secret",
      "allowFrom": ["your_id"]
    }
  }
}
```

**4. 运行**

```bash
nanocats gateway
```

</details>

## 🌐 Agent 社交网络

🐈 nanocats 能够连接到 agent 社交网络（agent 社区）。**只需发送一条消息，你的 nanocats 就会自动加入！**

| 平台 | 如何加入（向你的机器人发送此消息） |
|----------|-------------|
| [**Moltbook**](https://www.moltbook.com/) | `Read https://moltbook.com/skill.md and follow the instructions to join Moltbook` |
| [**ClawdChat**](https://clawdchat.ai/) | `Read https://clawdchat.ai/skill.md and follow the instructions to join ClawdChat` |

只需将上述命令发送给你的 nanocats（通过 CLI 或任何聊天渠道），它会处理剩下的工作。

## ⚙️ 配置

配置文件：`~/.nanocats/config.json`

### 提供商

> [!TIP]
> - **Groq** 通过 Whisper 提供免费的语音转录。如果配置了，Telegram 语音消息将自动转录。
> - **智谱编程计划**：如果你使用的是智谱的编程计划，在 zhipu 提供商配置中设置 `"apiBase": "https://open.bigmodel.cn/api/coding/paas/v4"`。
> - **MiniMax（中国大陆）**：如果你的 API 密钥来自 MiniMax 中国大陆平台（minimaxi.com），在 minimax 提供商配置中设置 `"apiBase": "https://api.minimaxi.com/v1"`。
> - **火山引擎编程计划**：如果你使用的是火山引擎的编程计划，在 volcengine 提供商配置中设置 `"apiBase": "https://ark.cn-beijing.volces.com/api/coding/v3"`。
> - **阿里云编程计划**：如果你使用的是阿里云编程计划（百炼），在 dashscope 提供商配置中设置 `"apiBase": "https://coding.dashscope.aliyuncs.com/v1"`。

| 提供商 | 用途 | 获取 API Key |
|----------|---------|-------------|
| `custom` | 任何 OpenAI 兼容端点（直连，无 LiteLLM） | — |
| `openrouter` | LLM（推荐，可访问所有模型） | [openrouter.ai](https://openrouter.ai) |
| `anthropic` | LLM（Claude 直连） | [console.anthropic.com](https://console.anthropic.com) |
| `azure_openai` | LLM（Azure OpenAI） | [portal.azure.com](https://portal.azure.com) |
| `openai` | LLM（GPT 直连） | [platform.openai.com](https://platform.openai.com) |
| `deepseek` | LLM（DeepSeek 直连） | [platform.deepseek.com](https://platform.deepseek.com) |
| `groq` | LLM + **语音转录**（Whisper） | [console.groq.com](https://console.groq.com) |
| `gemini` | LLM（Gemini 直连） | [aistudio.google.com](https://aistudio.google.com) |
| `minimax` | LLM（MiniMax 直连） | [platform.minimaxi.com](https://platform.minimaxi.com) |
| `aihubmix` | LLM（API 网关，可访问所有模型） | [aihubmix.com](https://aihubmix.com) |
| `siliconflow` | LLM（SiliconFlow/硅基流动） | [siliconflow.cn](https://siliconflow.cn) |
| `volcengine` | LLM（VolcEngine/火山引擎） | [volcengine.com](https://www.volcengine.com) |
| `dashscope` | LLM（通义千问） | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com) |
| `moonshot` | LLM（Moonshot/Kimi） | [platform.moonshot.cn](https://platform.moonshot.cn) |
| `zhipu` | LLM（智谱 GLM） | [open.bigmodel.cn](https://open.bigmodel.cn) |
| `ollama` | LLM（本地，Ollama） | — |
| `vllm` | LLM（本地，任何 OpenAI 兼容服务器） | — |
| `openai_codex` | LLM（Codex，OAuth） | `nanocats provider login openai-codex` |
| `github_copilot` | LLM（GitHub Copilot，OAuth） | `nanocats provider login github-copilot` |

<details>
<summary><b>OpenAI Codex（OAuth）</b></summary>

Codex 使用 OAuth 而非 API 密钥。需要 ChatGPT Plus 或 Pro 账户。

**1. 登录：**
```bash
nanocats provider login openai-codex
```

**2. 设置模型**（合并到 `~/.nanocats/config.json`）：
```json
{
  "agents": {
    "defaults": {
      "model": "openai-codex/gpt-5.1-codex"
    }
  }
}
```

**3. 聊天：**
```bash
nanocats agent -m "Hello!"

# 在本地针对特定工作区/配置
nanocats agent -c ~/.nanocats-telegram/config.json -m "Hello!"

# 在该配置基础上一次性覆盖工作区
nanocats agent -c ~/.nanocats-telegram/config.json -w /tmp/nanocats-telegram-test -m "Hello!"
```

> Docker 用户：使用 `docker run -it` 进行交互式 OAuth 登录。

</details>

<details>
<summary><b>自定义提供商（任何 OpenAI 兼容 API）</b></summary>

直接连接到任何 OpenAI 兼容端点 — LM Studio、llama.cpp、Together AI、Fireworks、Azure OpenAI 或任何自托管服务器。绕过 LiteLLM；模型名称原样传递。

```json
{
  "providers": {
    "custom": {
      "apiKey": "your-api-key",
      "apiBase": "https://api.your-provider.com/v1"
    }
  },
  "agents": {
    "defaults": {
      "model": "your-model-name"
    }
  }
}
```

> 对于不需要密钥的本地服务器，将 `apiKey` 设为任何非空字符串（例如 `"no-key"`）。

</details>

<details>
<summary><b>Ollama（本地）</b></summary>

使用 Ollama 运行本地模型，然后添加到配置：

**1. 启动 Ollama**（示例）：
```bash
ollama run llama3.2
```

**2. 添加到配置**（部分 — 合并到 `~/.nanocats/config.json`）：
```json
{
  "providers": {
    "ollama": {
      "apiBase": "http://localhost:11434"
    }
  },
  "agents": {
    "defaults": {
      "provider": "ollama",
      "model": "llama3.2"
    }
  }
}
```

> 当配置了 `providers.ollama.apiBase` 时，`provider: "auto"` 也可以工作，但设置 `"provider": "ollama"` 是最清晰的选项。

</details>

<details>
<summary><b>vLLM（本地 / OpenAI 兼容）</b></summary>

使用 vLLM 或任何 OpenAI 兼容服务器运行你自己的模型，然后添加到配置：

**1. 启动服务器**（示例）：
```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct --port 8000
```

**2. 添加到配置**（部分 — 合并到 `~/.nanocats/config.json`）：

*提供商（密钥可以是任何非空字符串用于本地）：*
```json
{
  "providers": {
    "vllm": {
      "apiKey": "dummy",
      "apiBase": "http://localhost:8000/v1"
    }
  }
}
```

*模型：*
```json
{
  "agents": {
    "defaults": {
      "model": "meta-llama/Llama-3.1-8B-Instruct"
    }
  }
}
```

</details>

<details>
<summary><b>添加新提供商（开发者指南）</b></summary>

nanocats 使用 **提供商注册表**（`nanocats/providers/registry.py`）作为唯一的真实来源。
添加新提供商只需 **2 步** — 无需修改 if-elif 链。

**步骤 1.** 在 `nanocats/providers/registry.py` 的 `PROVIDERS` 中添加 `ProviderSpec` 条目：

```python
ProviderSpec(
    name="myprovider",                   # 配置字段名
    keywords=("myprovider", "mymodel"),  # 模型名关键词用于自动匹配
    env_key="MYPROVIDER_API_KEY",        # LiteLLM 的环境变量
    display_name="My Provider",          # 在 `nanocats status` 中显示
    litellm_prefix="myprovider",         # 自动前缀：model → myprovider/model
    skip_prefixes=("myprovider/",),      # 不要双重前缀
)
```

**步骤 2.** 在 `nanocats/config/schema.py` 的 `ProvidersConfig` 中添加字段：

```python
class ProvidersConfig(BaseModel):
    ...
    myprovider: ProviderConfig = ProviderConfig()
```

就是这样！环境变量、模型前缀、配置匹配和 `nanocats status` 显示都会自动工作。

**常用 `ProviderSpec` 选项：**

| 字段 | 描述 | 示例 |
|-------|-------------|---------|
| `litellm_prefix` | 为 LiteLLM 自动添加模型名前缀 | `"dashscope"` → `dashscope/qwen-max` |
| `skip_prefixes` | 如果模型已以这些开头则不加前缀 | `("dashscope/", "openrouter/")` |
| `env_extras` | 设置额外的环境变量 | `(("ZHIPUAI_API_KEY", "{api_key}"),)` |
| `model_overrides` | 每模型参数覆盖 | `(("kimi-k2.5", {"temperature": 1.0}),)` |
| `is_gateway` | 可以路由任何模型（如 OpenRouter） | `True` |
| `detect_by_key_prefix` | 通过 API 密钥前缀检测网关 | `"sk-or-"` |
| `detect_by_base_keyword` | 通过 API base URL 检测网关 | `"openrouter"` |
| `strip_model_prefix` | 在重新添加前缀前去除现有前缀 | `True`（用于 AiHubMix） |

</details>


### MCP（Model Context Protocol）

> [!TIP]
> 配置格式与 Claude Desktop / Cursor 兼容。你可以直接从任何 MCP 服务器的 README 复制 MCP 服务器配置。

nanocats 支持 [MCP](https://modelcontextprotocol.io/) — 连接外部工具服务器并将其作为原生 agent 工具使用。

在 `config.json` 中添加 MCP 服务器：

```json
{
  "tools": {
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
      },
      "my-remote-mcp": {
        "url": "https://example.com/mcp/",
        "headers": {
          "Authorization": "Bearer xxxxx"
        }
      }
    }
  }
}
```

支持两种传输模式：

| 模式 | 配置 | 示例 |
|------|--------|---------|
| **Stdio** | `command` + `args` | 通过 `npx` / `uvx` 的本地进程 |
| **HTTP** | `url` + `headers`（可选） | 远程端点（`https://mcp.example.com/sse`） |

对于慢速服务器，使用 `toolTimeout` 覆盖默认的 30 秒每次调用超时：

```json
{
  "tools": {
    "mcpServers": {
      "my-slow-server": {
        "url": "https://example.com/mcp/",
        "toolTimeout": 120
      }
    }
  }
}
```

MCP 工具在启动时自动发现和注册。LLM 可以将它们与内置工具一起使用 — 无需额外配置。





### 安全

> [!TIP]
> 对于生产部署，在配置中设置 `"restrictToWorkspace": true` 以沙箱化 agent。
> 在 `v0.1.4.post3` 及更早版本中，空的 `allowFrom` 允许所有发送者。从 `v0.1.4.post4` 开始，空的 `allowFrom` 默认拒绝所有访问。要允许所有发送者，设置 `"allowFrom": ["*"]`。

| 选项 | 默认值 | 描述 |
|--------|---------|-------------|
| `tools.restrictToWorkspace` | `false` | 当为 `true` 时，限制**所有** agent 工具（shell、文件读/写/编辑、列表）只能在工作区目录内操作。防止路径遍历和越界访问。 |
| `tools.exec.pathAppend` | `""` | 运行 shell 命令时追加到 `PATH` 的额外目录（例如 `/usr/sbin` 用于 `ufw`）。 |
| `channels.*.allowFrom` | `[]`（拒绝所有） | 用户 ID 白名单。空表示拒绝所有；使用 `["*"]` 允许所有人。 |


## 🧩 多实例

使用独立的配置和运行时数据同时运行多个 nanocats 实例。使用 `--config` 作为主入口点，可选使用 `--workspace` 为特定运行覆盖工作区。

### 快速开始

```bash
# 实例 A - Telegram 机器人
nanocats gateway --config ~/.nanocats-telegram/config.json

# 实例 B - Discord 机器人  
nanocats gateway --config ~/.nanocats-discord/config.json

# 实例 C - 飞书机器人，自定义端口
nanocats gateway --config ~/.nanocats-feishu/config.json --port 18792
```

### 路径解析

使用 `--config` 时，nanocats 从配置文件位置派生其运行时数据目录。工作区仍来自 `agents.defaults.workspace`，除非你用 `--workspace` 覆盖它。

要针对这些实例之一打开 CLI 会话：

```bash
nanocats agent -c ~/.nanocats-telegram/config.json -m "Hello from Telegram instance"
nanocats agent -c ~/.nanocats-discord/config.json -m "Hello from Discord instance"

# 可选的一次性工作区覆盖
nanocats agent -c ~/.nanocats-telegram/config.json -w /tmp/nanocats-telegram-test
```

> `nanocats agent` 使用选定的工作区/配置启动本地 CLI agent。它不会附加到或代理已经运行的 `nanocats gateway` 进程。

| 组件 | 解析来源 | 示例 |
|-----------|---------------|---------|
| **配置** | `--config` 路径 | `~/.nanocats-A/config.json` |
| **工作区** | `--workspace` 或配置 | `~/.nanocats-A/workspace/` |
| **Cron 任务** | 配置目录 | `~/.nanocats-A/cron/` |
| **媒体 / 运行时状态** | 配置目录 | `~/.nanocats-A/media/` |

### 工作原理

- `--config` 选择要加载的配置文件
- 默认情况下，工作区来自该配置中的 `agents.defaults.workspace`
- 如果你传递 `--workspace`，它会覆盖配置文件中的工作区

### 最小设置

1. 将基础配置复制到新的实例目录。
2. 为该实例设置不同的 `agents.defaults.workspace`。
3. 使用 `--config` 启动实例。

示例配置：

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.nanocats-telegram/workspace",
      "model": "anthropic/claude-sonnet-4-6"
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "YOUR_TELEGRAM_BOT_TOKEN"
    }
  },
  "gateway": {
    "port": 18790
  }
}
```

启动独立实例：

```bash
nanocats gateway --config ~/.nanocats-telegram/config.json
nanocats gateway --config ~/.nanocats-discord/config.json
```

需要时为一次性运行覆盖工作区：

```bash
nanocats gateway --config ~/.nanocats-telegram/config.json --workspace /tmp/nanocats-telegram-test
```

### 常见用例

- 为 Telegram、Discord、飞书和其他平台运行独立的机器人
- 保持测试和生产实例隔离
- 为不同团队使用不同的模型或提供商
- 用独立的配置和运行时数据服务多个租户

### 注意事项

- 每个实例如果同时运行必须使用不同的端口
- 如果你想要隔离的内存、会话和技能，每个实例使用不同的工作区
- `--workspace` 覆盖配置文件中定义的工作区
- Cron 任务和运行时媒体/状态从配置目录派生

## 💻 CLI 参考

| 命令 | 描述 |
|---------|-------------|
| `nanocats onboard` | 初始化配置和工作区 |
| `nanocats agent -m "..."` | 与 agent 聊天 |
| `nanocats agent -w <workspace>` | 针对特定工作区聊天 |
| `nanocats agent -w <workspace> -c <config>` | 针对特定工作区/配置聊天 |
| `nanocats agent` | 交互式聊天模式 |
| `nanocats agent --no-markdown` | 显示纯文本回复 |
| `nanocats agent --logs` | 聊天时显示运行时日志 |
| `nanocats gateway` | 启动网关 |
| `nanocats status` | 显示状态 |
| `nanocats provider login openai-codex` | 提供商 OAuth 登录 |
| `nanocats channels login` | 关联 WhatsApp（扫描二维码） |
| `nanocats channels status` | 显示渠道状态 |

交互模式退出方式：`exit`、`quit`、`/exit`、`/quit`、`:q` 或 `Ctrl+D`。

<details>
<summary><b>心跳（定时任务）</b></summary>

网关每 30 分钟唤醒一次并检查工作区中的 `HEARTBEAT.md`（`~/.nanocats/workspace/HEARTBEAT.md`）。如果文件有任务，agent 会执行它们并将结果发送到你最近活跃的聊天渠道。

**设置：** 编辑 `~/.nanocats/workspace/HEARTBEAT.md`（由 `nanocats onboard` 自动创建）：

```markdown
## 定时任务

- [ ] 查看天气预报并发送摘要
- [ ] 扫描收件箱中的紧急邮件
```

agent 也可以自己管理这个文件 — 让它"添加一个定时任务"，它会为你更新 `HEARTBEAT.md`。

> **注意：** 网关必须正在运行（`nanocats gateway`），并且你必须至少与机器人聊过一次，以便它知道将结果发送到哪个渠道。

</details>

## 🐳 Docker

> [!TIP]
> `-v ~/.nanocats:/root/.nanocats` 标志将你的本地配置目录挂载到容器中，这样你的配置和工作区在容器重启之间会持久保存。

### Docker Compose

```bash
docker compose run --rm nanocats-cli onboard   # 首次设置
vim ~/.nanocats/config.json                     # 添加 API 密钥
docker compose up -d nanocats-gateway           # 启动网关
```

```bash
docker compose run --rm nanocats-cli agent -m "Hello!"   # 运行 CLI
docker compose logs -f nanocats-gateway                   # 查看日志
docker compose down                                      # 停止
```

### Docker

```bash
# 构建镜像
docker build -t nanocats .

# 初始化配置（仅首次）
docker run -v ~/.nanocats:/root/.nanocats --rm nanocats onboard

# 在主机上编辑配置以添加 API 密钥
vim ~/.nanocats/config.json

# 运行网关（连接到已启用的渠道，例如 Telegram/Discord/Mochat）
docker run -v ~/.nanocats:/root/.nanocats -p 18790:18790 nanocats gateway

# 或运行单个命令
docker run -v ~/.nanocats:/root/.nanocats --rm nanocats agent -m "Hello!"
docker run -v ~/.nanocats:/root/.nanocats --rm nanocats status
```

## 🐧 Linux 服务

将网关作为 systemd 用户服务运行，这样它会自动启动并在失败时重启。

**1. 查找 nanocats 二进制文件路径：**

```bash
which nanocats   # 例如 /home/user/.local/bin/nanocats
```

**2. 创建服务文件** 位于 `~/.config/systemd/user/nanocats-gateway.service`（如需要替换 `ExecStart` 路径）：

```ini
[Unit]
Description=Nanobot Gateway
After=network.target

[Service]
Type=simple
ExecStart=%h/.local/bin/nanocats gateway
Restart=always
RestartSec=10
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=%h

[Install]
WantedBy=default.target
```

**3. 启用并启动：**

```bash
systemctl --user daemon-reload
systemctl --user enable --now nanocats-gateway
```

**常用操作：**

```bash
systemctl --user status nanocats-gateway        # 检查状态
systemctl --user restart nanocats-gateway       # 配置更改后重启
journalctl --user -u nanocats-gateway -f        # 跟踪日志
```

如果你编辑了 `.service` 文件本身，在重启前运行 `systemctl --user daemon-reload`。

> **注意：** 用户服务仅在你登录时运行。要在注销后保持网关运行，启用 lingering：
>
> ```bash
> loginctl enable-linger $USER
> ```

## 📁 项目结构

```
nanocats/
├── agent/          # 🧠 核心 agent 逻辑
│   ├── loop.py     #    Agent 循环（LLM ↔ 工具执行）
│   ├── context.py  #    提示构建器
│   ├── memory.py   #    持久化内存
│   ├── skills.py   #    技能加载器
│   ├── subagent.py #    后台任务执行
│   └── tools/      #    内置工具（包括 spawn）
├── skills/         # 🎯 内置技能（github, weather, tmux...）
├── channels/       # 📱 聊天渠道集成
├── bus/            # 🚌 消息路由
├── cron/           # ⏰ 定时任务
├── heartbeat/      # 💓 主动唤醒
├── providers/      # 🤖 LLM 提供商（OpenRouter 等）
├── session/        # 💬 对话会话
├── config/         # ⚙️ 配置
└── cli/            # 🖥️ 命令
```

## 🤝 贡献与路线图

欢迎提交 PR！代码库特意保持小巧和可读。🤗

**路线图** — 选择一项并[提交 PR](https://github.com/HKUDS/nanocats/pulls)！

- [ ] **多模态** — 看和听（图像、语音、视频）
- [ ] **长期记忆** — 永不遗忘重要上下文
- [ ] **更好的推理** — 多步规划和反思
- [ ] **更多集成** — 日历等
- [ ] **自我改进** — 从反馈和错误中学习

### 贡献者

<a href="https://github.com/HKUDS/nanocats/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=HKUDS/nanocats&max=100&columns=12&updated=20260210" alt="Contributors" />
</a>


## ⭐ Star 历史

<div align="center">
  <a href="https://star-history.com/#HKUDS/nanocats&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=HKUDS/nanocats&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=HKUDS/nanocats&type=Date" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=HKUDS/nanocats&type=Date" style="border-radius: 15px; box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);" />
    </picture>
  </a>
</div>

<p align="center">
  <em> 感谢访问 ✨ nanocats！</em><br><br>
  <img src="https://visitor-badge.laobi.icu/badge?page_id=HKUDS.nanocats&style=for-the-badge&color=00d4ff" alt="Views">
</p>


<p align="center">
  <sub>nanocats 仅供教育、研究和技术交流目的使用</sub>
</p>
