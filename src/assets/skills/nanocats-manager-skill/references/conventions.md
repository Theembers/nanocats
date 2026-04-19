# nanocats-manager 命令规范

本文档定义 nanocat-api.py 的所有命令规范和使用约束。

---

## 安全策略

> **重要**: exec 安全策略会阻止含 `localhost`/`127.0.0.1` 的内联 Python/curl 命令，请使用封装脚本。

---

## 基本用法

```bash
python3 nanocat-api.py <port> <command> [args...]
```

**脚本位置**: `{skill_dir}/nanocat-api.py`

---

## 端口发现

> **端口发现规则**: nanocat-manager 端口可能变化，**使用前必须自动探测**。

```bash
# 方法：探测常用端口，返回第一个 open 的
for port in 3000 18789 8080; do
  nc -z -w1 127.0.0.1 $port 2>/dev/null && echo "Found: $port" && break
done
```

---

## Agent 管理命令

| 操作 | 命令格式 |
|------|----------|
| 列出所有 Agent | `nanocat-api.py <port> list-agents` |
| Agent 详情 | `nanocat-api.py <port> agent-status <name>` |
| 启动 Agent | `nanocat-api.py <port> start-agent <name>` |
| 停止 Agent | `nanocat-api.py <port> stop-agent <name>` |
| 重启 Agent | `nanocat-api.py <port> restart-agent <name>` |

### 使用示例

```bash
# 查看所有 Agent
python3 nanocat-api.py 3000 list-agents

# 重启指定 Agent
python3 nanocat-api.py 3000 restart-agent bro
```

---

## 共享配置命令

Manager/Member agents 可以查询和同步共享的 Skills、MCP 配置。

| 操作 | 命令格式 |
|------|----------|
| 获取共享 Skills | `nanocat-api.py <port> shared-config skills` |
| 添加共享 Skill | `nanocat-api.py <port> shared-config add-skill <name> <path> <managerName>` |
| 移除共享 Skill | `nanocat-api.py <port> shared-config remove-skill <name> <managerName>` |
| 获取共享 MCP | `nanocat-api.py <port> shared-config mcp` |
| 查看已链接 Agents | `nanocat-api.py <port> shared-config members` |
| 触发配置同步 | `nanocat-api.py <port> shared-config apply` |

### 共享配置同步内容

1. **MCP**: 追加到 `config.json` 的 `tools.mcpServers`
2. **Skills**: 在 `workspace/skills/` 创建符号链接

> **同步规则**: 只有 Manager agent 调用 `apply` 才会真正执行同步。

### 使用示例

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

## Agent 配置命令

| 操作 | 命令格式 |
|------|----------|
| 获取配置 | `nanocat-api.py <port> get-config <name>` |
| 更新配置 | `nanocat-api.py <port> update-config <name> '<json>'` |

---

## Agent 环境变量命令

| 操作 | 命令格式 |
|------|----------|
| 获取环境变量 | `nanocat-api.py <port> get-env <name>` |
| 更新环境变量 | `nanocat-api.py <port> update-env <name> '<content>'` |

---

## Agent Workspace 文件命令

可管理文件类型: `AGENTS`, `SOUL`, `USER`, `TOOLS`, `HEARTBEAT`

| 操作 | 命令格式 |
|------|----------|
| 列出文件 | `nanocat-api.py <port> list-workspace <name>` |
| 读取文件 | `nanocat-api.py <port> get-workspace <name> <file>` |
| 更新文件 | `nanocat-api.py <port> update-workspace <name> <file> '<content>'` |

---

## Agent Skills 命令

| 操作 | 命令格式 |
|------|----------|
| 列出 Skills | `nanocat-api.py <port> list-skills <name>` |
| 更新 Skills | `nanocat-api.py <port> update-skills <name> '<json>'` |

---

## 日志命令

| 操作 | 命令格式 |
|------|----------|
| 运行日志 | `nanocat-api.py <port> logs <name>` |

---

## Teams 命令

| 操作 | 命令格式 |
|------|----------|
| 列出所有 Teams | `nanocat-api.py <port> list-teams` |
| Team 看板 | `nanocat-api.py <port> team-board <team-name>` |
| Team 任务 | `nanocat-api.py <port> team-tasks <team-name>` |
| Team 成员 | `nanocat-api.py <port> team-agents <team-name>` |

---

## 系统命令

| 操作 | 命令格式 |
|------|----------|
| 获取版本 | `nanocat-api.py <port> version` |
| 检查更新 | `nanocat-api.py <port> check-update` |

---

## 使用约束

1. **先探测端口，再调用** — 不要假设端口号
2. 所有 `<xxx>` 占位符需替换为实际值
3. JSON 内容用单引号包裹
4. 需要 `requests` 库（通常已预装）
5. 所有操作自动记录到 nanocats-manager 日志

---

## 命令速查表

```
list-agents, agent-status, start-agent, stop-agent, restart-agent
shared-config (skills|mcp|members|apply), add-skill, remove-skill
get-config, update-config
get-env, update-env
list-workspace, get-workspace, update-workspace
list-skills, update-skills
logs
list-teams, team-board, team-tasks, team-agents
version, check-update
```
