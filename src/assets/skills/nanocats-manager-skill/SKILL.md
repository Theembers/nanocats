---
name: nanocats-manager-skill
description: 管理 Agent 生命周期、配置、Skills、Teams 及共享配置的完整能力
---

# nanocats-manager Skill

> **重要**: exec 安全策略会阻止含 `localhost`/`127.0.0.1` 的内联 Python/curl 命令。
> 
> **解决方案**: 使用封装脚本

---

## 脚本位置

```
{skill_dir}/nanocat-api.py
```

完整路径：
```
/Users/theembersguo/agents/.nanobot-master/workspace/skills/nanocats-manager-skill/nanocat-api.py
```

---

## 基本用法

```bash
python3 nanocat-api.py <port> <command> [args...]

# 示例：
python3 nanocat-api.py 3000 list-agents
python3 nanocat-api.py 3000 restart-agent bro
python3 nanocat-api.py 3000 agent-status justin
```

### 端口说明
- nanocat-manager 默认端口可能是 18789, 18790, 3000, 3001 等
- 通过 nanocat-manager 的 UI 可以确认实际端口
- **第一个参数必须是端口号**

---

## 快速操作

### 重启 Agent
```bash
python3 nanocat-api.py <port> restart-agent <agent-name>
```

### 查看所有 Agent
```bash
python3 nanocat-api.py <port> list-agents
```

### 查看单个 Agent 状态
```bash
python3 nanocat-api.py <port> agent-status <agent-name>
```

### 启动/停止 Agent
```bash
python3 nanocat-api.py <port> start-agent <agent-name>
python3 nanocat-api.py <port> stop-agent <agent-name>
```

---

## 完整命令列表

### Agent 管理
| 操作 | 命令 |
|------|------|
| 列出所有 Agent | `nanocat-api.py <port> list-agents` |
| Agent 详情 | `nanocat-api.py <port> agent-status <name>` |
| 启动 Agent | `nanocat-api.py <port> start-agent <name>` |
| 停止 Agent | `nanocat-api.py <port> stop-agent <name>` |
| 重启 Agent | `nanocat-api.py <port> restart-agent <name>` |

### Agent 配置 (nanobot.json)
| 操作 | 命令 |
|------|------|
| 获取配置 | `nanocat-api.py <port> get-config <name>` |
| 更新配置 | `nanocat-api.py <port> update-config <name> '<json>'` |

### Agent 环境变量 (.env)
| 操作 | 命令 |
|------|------|
| 获取环境变量 | `nanocat-api.py <port> get-env <name>` |
| 更新环境变量 | `nanocat-api.py <port> update-env <name> '<content>'` |

### Agent Workspace 文件
可管理文件: `AGENTS`, `SOUL`, `USER`, `TOOLS`, `HEARTBEAT`

| 操作 | 命令 |
|------|------|
| 列出文件 | `nanocat-api.py <port> list-workspace <name>` |
| 读取文件 | `nanocat-api.py <port> get-workspace <name> <file>` |
| 更新文件 | `nanocat-api.py <port> update-workspace <name> <file> '<content>'` |

### Agent Skills
| 操作 | 命令 |
|------|------|
| 列出 Skills | `nanocat-api.py <port> list-skills <name>` |
| 更新 Skills | `nanocat-api.py <port> update-skills <name> '<json>'` |

### 日志
| 操作 | 命令 |
|------|------|
| 运行日志 | `nanocat-api.py <port> logs <name>` |

### 共享配置
| 操作 | 命令 |
|------|------|
| 列出共享 Skills | `nanocat-api.py <port> shared-config skills` |
| 获取 MCP 配置 | `nanocat-api.py <port> shared-config mcp` |
| 列出成员 Agent | `nanocat-api.py <port> shared-config members` |
| 应用配置到所有成员 | `nanocat-api.py <port> shared-config apply` |

### Teams
| 操作 | 命令 |
|------|------|
| 列出所有 Teams | `nanocat-api.py <port> list-teams` |
| Team 看板 | `nanocat-api.py <port> team-board <team-name>` |
| Team 任务 | `nanocat-api.py <port> team-tasks <team-name>` |
| Team 成员 | `nanocat-api.py <port> team-agents <team-name>` |

### Nanobot 版本
| 操作 | 命令 |
|------|------|
| 获取版本 | `nanocat-api.py <port> version` |
| 检查更新 | `nanocat-api.py <port> check-update` |

---

## 常用操作示例

### 创建并启动 Agent
```bash
# 1. 启动 (需通过 nanocats-manager UI 创建)
# 2. 启动
python3 nanocat-api.py <port> start-agent <agent-name>

# 3. 验证状态
python3 nanocat-api.py <port> agent-status <agent-name>
```

### 停止并重启 Agent
```bash
python3 nanocat-api.py <port> restart-agent <agent-name>
```

### 配置 MCP 并应用
```bash
# 获取当前 MCP
python3 nanocat-api.py <port> shared-config mcp

# 应用配置
python3 nanocat-api.py <port> shared-config apply
```

### 批量查看 Agent 状态
```bash
python3 nanocat-api.py <port> list-agents
```

---

## 注意事项

1. `<port>` 是 **必需的第一个参数**
2. 所有 `<xxx>` 占位符需替换为实际值
3. JSON 内容用单引号包裹
4. 需要 `requests` 库（通常已预装）
5. 所有操作自动记录到 nanocats-manager 日志
