# nanocats CLI 操作手册

## 全局选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--version` | `-v` | 显示版本信息 |

---

## 主命令

### help

显示帮助信息。

**用法：**
```bash
nanocats help [command]
```

**参数：**
- `command`（可选）：指定要查看帮助的命令名称

**示例：**
```bash
nanocats help              # 显示所有可用命令
nanocats help gateway      # 显示 gateway 命令的详细帮助
```

---

### onboard

初始化 nanocats 配置和工作空间。

**用法：**
```bash
nanocats onboard
```

**说明：**
- 如果配置文件已存在，会提示选择覆盖或刷新配置
- 初始化完成后可选择运行设置向导或直接启动 Gateway

---

### setup

交互式设置向导，引导完成完整的安装配置。

**用法：**
```bash
nanocats setup
```

**配置内容：**
1. 依赖检查（Python、Node.js、核心依赖包）
2. 模型提供商配置（API 密钥、模型选择）
3. Master Agent 创建（ID、名称、访问令牌）
4. 通道配置（Telegram、Discord、飞书、钉钉等）

---

### gateway

启动 nanocats Gateway 服务（Swarm 模式）。

**用法：**
```bash
nanocats gateway [OPTIONS]
```

**选项：**

| 选项 | 简写 | 说明 |
|------|------|------|
| `--port` | `-p` | 指定 Gateway 端口 |
| `--workspace` | `-w` | 指定工作空间目录 |
| `--config` | `-c` | 指定配置文件路径 |
| `--verbose` | `-v` | 启用调试日志输出 |

**示例：**
```bash
nanocats gateway                    # 使用默认配置启动
nanocats gateway -p 8080            # 指定端口 8080
nanocats gateway -c /path/to/config.json   # 使用指定配置文件
nanocats gateway -v                 # 启用调试模式
```

---

### status

显示 nanocats 系统状态。

**用法：**
```bash
nanocats status
```

**显示信息：**
- 配置文件状态
- 工作空间状态
- 当前使用的模型
- 各提供商 API 密钥配置状态

---

## Swarm 管理命令

### swarm status

显示 Swarm 集群状态。

**用法：**
```bash
nanocats swarm status
```

**显示信息：**
- Swarm 是否启用
- 最大 Agent 数量
- Agent 配置目录
- MCP 注册表路径
- 已配置的 Agent 列表（ID、名称、类型、自动启动状态、通道）

---

### swarm list

列出所有已配置的 Agent。

**用法：**
```bash
nanocats swarm list
```

**显示信息：**
- Agent ID
- 显示名称
- 类型
- 使用的模型
- 工作空间路径

---

### swarm create

创建新的 Agent 配置。

**用法：**
```bash
nanocats swarm create <agent_id> [OPTIONS]
```

**参数：**
- `agent_id`（必填）：Agent 的唯一标识符

**选项：**

| 选项 | 简写 | 说明 |
|------|------|------|
| `--name` | `-n` | Agent 显示名称 |
| `--type` | `-t` | Agent 类型（supervisor、user、specialized、task），默认 user |
| `--bound-user` | `-b` | 用户绑定键（仅 user 类型需要） |
| `--model` | `-m` | 指定使用的模型 |

**示例：**
```bash
nanocats swarm create my-agent              # 创建默认 user 类型 Agent
nanocats swarm create my-agent -n "My Agent" -t supervisor   # 创建 supervisor 类型
nanocats swarm create user1 -b user_key_123 -m gpt-4o        # 创建绑定用户的 Agent
```

---

### swarm mcp

管理 MCP 服务器注册表。

**用法：**
```bash
nanocats swarm mcp <action> [name] [OPTIONS]
```

**参数：**
- `action`（必填）：操作类型（list、install、uninstall）
- `name`（可选）：MCP 服务器名称

**选项：**

| 选项 | 简写 | 说明 |
|------|------|------|
| `--command` | `-c` | MCP 命令（install 时使用） |
| `--args` | `-a` | MCP 参数，逗号分隔（install 时使用） |

**示例：**
```bash
nanocats swarm mcp list                              # 列出所有 MCP 服务器
nanocats swarm mcp install my-server -c "npx" -a "-y,@modelcontextprotocol/server-filesystem,/tmp"   # 安装 MCP 服务器
nanocats swarm mcp uninstall my-server               # 卸载 MCP 服务器
```

---

## 通道管理命令

### channels status

显示所有通道的配置状态。

**用法：**
```bash
nanocats channels status
```

**显示通道：**
- WhatsApp
- Discord
- Feishu（飞书）
- Mochat
- Telegram
- Slack
- DingTalk（钉钉）
- QQ
- Email

---

### channels login

通过二维码链接 WhatsApp 设备。

**用法：**
```bash
nanocats channels login
```

**说明：**
- 启动 WhatsApp Bridge 服务
- 显示二维码供扫描
- 需要 Node.js >= 18 和 npm

---

## 提供商管理命令

### provider login

使用 OAuth 登录提供商。

**用法：**
```bash
nanocats provider login <provider>
```

**参数：**
- `provider`（必填）：OAuth 提供商名称

**支持的提供商：**
- `openai-codex`：OpenAI Codex OAuth 登录
- `github-copilot`：GitHub Copilot OAuth 登录

**示例：**
```bash
nanocats provider login openai-codex      # 登录 OpenAI Codex
nanocats provider login github-copilot    # 登录 GitHub Copilot
```

---

## 命令速查表

| 命令 | 功能 |
|------|------|
| `nanocats onboard` | 初始化配置和工作空间 |
| `nanocats setup` | 交互式安装向导 |
| `nanocats gateway` | 启动 Gateway 服务 |
| `nanocats status` | 查看系统状态 |
| `nanocats help` | 查看帮助信息 |
| `nanocats swarm status` | 查看 Swarm 状态 |
| `nanocats swarm list` | 列出所有 Agent |
| `nanocats swarm create <id>` | 创建新 Agent |
| `nanocats swarm mcp list` | 列出 MCP 服务器 |
| `nanocats swarm mcp install <name>` | 安装 MCP 服务器 |
| `nanocats swarm mcp uninstall <name>` | 卸载 MCP 服务器 |
| `nanocats channels status` | 查看通道状态 |
| `nanocats channels login` | WhatsApp 二维码登录 |
| `nanocats provider login <provider>` | OAuth 登录 |
