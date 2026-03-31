---
name: nanocats-manager-skill
description: 管理 Agent 生命周期、配置、Skills、Teams 及共享配置的完整能力
---

# nanocats-manager Skill

> **重要**: exec 安全策略会阻止含 `localhost`/`127.0.0.1` 的内联 Python/curl 命令，请使用封装脚本。

---

## 概述

通过 REST API 管理 nanocats-manager 的所有功能，包括 Agent 生命周期、共享配置、Teams 等。

**脚本位置**: `{skill_dir}/nanocat-api.py`

**基本用法**:
```bash
python3 nanocat-api.py <port> <command> [args...]
```

> **端口发现**: nanocat-manager 端口可能变化，**使用前必须自动探测**。执行 `nc -z -w1 127.0.0.1 {port}` 测试 3000、18789 等常用端口，连接成功的即为 manager API 端口。

---

## 核心功能

### Agent 管理

| 操作 | 命令 |
|------|------|
| 列出所有 Agent | `nanocat-api.py <port> list-agents` |
| Agent 详情 | `nanocat-api.py <port> agent-status <name>` |
| 启动 Agent | `nanocat-api.py <port> start-agent <name>` |
| 停止 Agent | `nanocat-api.py <port> stop-agent <name>` |
| 重启 Agent | `nanocat-api.py <port> restart-agent <name>` |

**示例**:
```bash
# 查看所有 Agent
python3 nanocat-api.py 3000 list-agents

# 重启指定 Agent
python3 nanocat-api.py 3000 restart-agent bro
```

---

### 共享配置

Manager/Member agents 可以查询和同步共享的 Skills、MCP 配置。

| 操作 | 命令 |
|------|------|
| 获取共享 Skills | `nanocat-api.py <port> shared-config skills` |
| 添加共享 Skill | `nanocat-api.py <port> shared-config add-skill <name> <path> <managerName>` |
| 移除共享 Skill | `nanocat-api.py <port> shared-config remove-skill <name> <managerName>` |
| 获取共享 MCP | `nanocat-api.py <port> shared-config mcp` |
| 查看已链接 Agents | `nanocat-api.py <port> shared-config members` |
| 触发配置同步 | `nanocat-api.py <port> shared-config apply` |

**共享配置同步内容**:

1. **MCP**: 追加到 `config.json` 的 `tools.mcpServers`
2. **Skills**: 在 `workspace/skills/` 创建符号链接

> 只有 Manager agent 调用 `apply` 才会真正执行同步。

**示例**:
```bash
# 查询共享 Skills
python3 nanocat-api.py 3000 shared-config skills
# 返回: { "skills": [{ "name": "persona", "enabled": true }, ...] }

# 添加共享 Skill（从 Manager 的 workspace/skills 复制）
python3 nanocat-api.py 3000 shared-config add-skill my-skill /path/to/skill Master

# 移除共享 Skill
python3 nanocat-api.py 3000 shared-config remove-skill my-skill Master

# 查询共享 MCP
python3 nanocat-api.py 3000 shared-config mcp
# 返回: { "MiniMax": { "command": "uvx", ... } }

# 触发同步
python3 nanocat-api.py 3000 shared-config apply
```

---

### Agent 配置

| 操作 | 命令 |
|------|------|
| 获取配置 | `nanocat-api.py <port> get-config <name>` |
| 更新配置 | `nanocat-api.py <port> update-config <name> '<json>'` |

---

### Agent 环境变量

| 操作 | 命令 |
|------|------|
| 获取环境变量 | `nanocat-api.py <port> get-env <name>` |
| 更新环境变量 | `nanocat-api.py <port> update-env <name> '<content>'` |

---

### Agent Workspace 文件

可管理文件: `AGENTS`, `SOUL`, `USER`, `TOOLS`, `HEARTBEAT`

| 操作 | 命令 |
|------|------|
| 列出文件 | `nanocat-api.py <port> list-workspace <name>` |
| 读取文件 | `nanocat-api.py <port> get-workspace <name> <file>` |
| 更新文件 | `nanocat-api.py <port> update-workspace <name> <file> '<content>'` |

---

### Agent Skills

| 操作 | 命令 |
|------|------|
| 列出 Skills | `nanocat-api.py <port> list-skills <name>` |
| 更新 Skills | `nanocat-api.py <port> update-skills <name> '<json>'` |

---

### 日志

| 操作 | 命令 |
|------|------|
| 运行日志 | `nanocat-api.py <port> logs <name>` |

---

## Teams 功能

| 操作 | 命令 |
|------|------|
| 列出所有 Teams | `nanocat-api.py <port> list-teams` |
| Team 看板 | `nanocat-api.py <port> team-board <team-name>` |
| Team 任务 | `nanocat-api.py <port> team-tasks <team-name>` |
| Team 成员 | `nanocat-api.py <port> team-agents <team-name>` |

---

## 系统信息

| 操作 | 命令 |
|------|------|
| 获取版本 | `nanocat-api.py <port> version` |
| 检查更新 | `nanocat-api.py <port> check-update` |

---

## 端口自动发现

调用 skill 前，**必须先自动发现 manager API 端口**：

```bash
# 方法：探测常用端口，返回第一个 open 的
for port in 3000 18789 8080; do
  nc -z -w1 127.0.0.1 $port 2>/dev/null && echo "Found: $port" && break
done
```

## 注意事项

1. **先探测端口，再调用 skill** — 不要假设端口号
2. 所有 `<xxx>` 占位符需替换为实际值
3. JSON 内容用单引号包裹
4. 需要 `requests` 库（通常已预装）
5. 所有操作自动记录到 nanocats-manager 日志
