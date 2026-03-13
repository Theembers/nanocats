# nanocats Workspace 设计说明

## 概述

本文档描述 nanocats 项目中 workspace（工作空间）的设计原则、路径规范和权限模型。

## 设计原则

### 1. 隔离性

每个 Agent 拥有独立的工作空间，确保：
- 数据隔离：Agent 的记忆、会话、技能互不影响
- 安全隔离：Agent 只能访问自己的工作空间
- 生命周期隔离：Agent 的创建、销毁不影响其他 Agent

### 2. 分层设计

```
~/.nanocats/
├── templates/              # 全局模板空间
│   ├── AGENTS.md
│   ├── TOOLS.md
│   ├── HEARTBEAT.md
│   ├── SOUL.md
│   ├── USER.md
│   ├── BOOTSTRAP.md
│   └── skills/             # 全局共享 skills
│
└── workspaces/             # Agent 工作空间目录
    ├── {agent_id_1}/       # Agent 1 的独立空间
    │   ├── memory/         # 记忆存储
    │   ├── skills/         # Agent 专属 skills
    │   └── sessions/       # 会话历史
    ├── {agent_id_2}/       # Agent 2 的独立空间
    │   ├── memory/
    │   ├── skills/
    │   └── sessions/
    └── {agent_id_n}/       # Agent n 的独立空间
        ├── memory/
        ├── skills/
        └── sessions/
```

## 路径规范

### 全局模板空间

| 属性 | 值 |
|------|-----|
| 路径 | `~/.nanocats/templates` |
| 用途 | 存放全局模板文件和共享 skills |
| 配置项 | `agents.defaults.workspace` |
| 默认值 | `"~/.nanocats/templates"` |

### Agent 工作空间

| 属性 | 值 |
|------|-----|
| 路径 | `~/.nanocats/workspaces/{agent_id}` |
| 用途 | 存放 Agent 专属数据 |
| 生成规则 | 如果未指定，默认为 `~/.nanocats/workspaces/{agent_id}` |
| 子目录 | `memory/`, `skills/`, `sessions/` |

## Agent 类型与 Workspace 关系

| Agent 类型 | Workspace 需求 | 说明 |
|------------|----------------|------|
| **Supervisor** | 有 | 全局管理者，可访问全局 templates |
| **User** | 有 | 普通用户 Agent，独立工作空间 |
| **Specialized** | 有 | 专业 Agent，独立工作空间 |
| **Task** | 无 | 临时性 Agent，无持久化 workspace |

## Skill 安装权限模型

### 权限矩阵

| Agent 类型 | 全局安装 | 本地安装 | 说明 |
|------------|----------|----------|------|
| **Supervisor** | ✅ | ✅ | 可选择安装到全局或自己的 workspace |
| **User** | ❌ | ✅ | 只能安装到自己的 workspace |
| **Specialized** | ❌ | ✅ | 只能安装到自己的 workspace |
| **Task** | ❌ | ❌ | 临时性 Agent，不安装 skill |

### 安装路径规则

#### 全局安装（仅 Supervisor）

```bash
npx --yes clawhub@latest install <slug> --workdir ~/.nanocats/templates
```

- 安装位置：`~/.nanocats/templates/skills/`
- 影响范围：所有 Agent 都能使用
- 适用场景：通用 skills，如天气查询、文件操作等

#### 本地安装（所有非 Task Agent）

```bash
npx --yes clawhub@latest install <slug> --workdir ~/.nanocats/workspaces/{agent_id}
```

- 安装位置：`~/.nanocats/workspaces/{agent_id}/skills/`
- 影响范围：仅当前 Agent 可用
- 适用场景：Agent 专属 skills，如特定业务逻辑
