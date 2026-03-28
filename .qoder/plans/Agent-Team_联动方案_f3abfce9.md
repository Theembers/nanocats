# Agent 模块与 Team 模块联动方案

## 一、ClawTeam 支持情况分析

### 1. ClawTeam 的两种添加 Agent 到 Team 的方式

| 方式 | 命令 | 行为 | 是否管理进程 |
|------|------|------|------------|
| **spawn** | `clawteam spawn --team <team> nanobot` | 启动**新的** nanobot 进程（在 tmux 中） | 是，会创建新进程 |
| **add-member** | `clawteam team add-member <team> <name>` | 仅在 team config 中**注册元数据** | 否，纯元数据操作 |

### 2. 回答用户的三个问题

**Q1: Leader 能否指定已有的 agent 实例？**

ClawTeam 的 `spawn-team` 创建 team 时会自动创建一个 leader member（纯元数据），但不绑定到任何已运行的进程。可以通过 `add-member --agent-id <已有agent的ID>` 将已有 agent 注册为 team 成员，但 **leader 身份在创建 team 时已固定**，不能事后将一个已有 agent 指定为 leader。

**Q2: Team 中能否直接绑定已有的 agent 实例？**

可以，但有限制：
- `clawteam team add-member` **仅注册元数据**（name、agentId、agentType），不连接到已运行的 nanobot gateway 进程
- 注册后，该 agent 可以使用 ClawTeam 的协调功能（任务分配、消息收发）
- 但 ClawTeam **不会管理该 agent 的进程生命周期**（启停仍由 nanocats-manager 控制）

**Q3: ClawTeam 是否原生支持这种模式？**

**部分支持**。ClawTeam 设计上假设 agent 要么通过 `spawn` 启动（由 ClawTeam 全权管理），要么通过 `add-member` 注册（仅元数据）。它**不支持连接到一个已经在运行的 nanobot gateway 进程**。但由于 `add-member` 是纯元数据操作，我们可以利用它实现"软绑定"——nanocats-manager 管进程，ClawTeam 管协调。

---

## 二、当前两个模块的隔离现状

```
nanocats-manager Agent 模块          ClawTeam Team 模块
===========================          ====================
AgentInstance {                      TeamMember {
  id, name, configPath,                name, agentId,
  workspacePath, port,                 agentType, joinedAt
  status, pid                        }
}                                    
存储: agents-store.json              存储: ~/.clawteam/teams/*/config.json
进程: ProcessManager                 进程: spawn_registry.json (仅 spawn 创建的)
```

两者完全独立，没有任何关联字段。

---

## 三、改造方案：单向注册 + 双向展示

### 核心思路

nanocats-manager 继续全权管理 nanobot agent 的进程生命周期（启停、日志、端口），通过 `clawteam team add-member` 将 agent 注册到 team 实现协调能力（任务、消息）。UI 上双向展示绑定关系。

### Task 1: 扩展数据模型

**修改 `src/lib/types.ts`**：
- `AgentInstance` 新增可选字段 `teamBindings?: { teamName: string; memberName: string }[]`，记录该 agent 绑定了哪些 team
- `Team` 新增可选字段 `boundAgents?: { memberName: string; agentInstanceId: string }[]`，记录 team 成员与 agent 实例的绑定关系

### Task 2: 新增绑定/解绑 CLI 封装

**修改 `src/lib/clawteam.ts`**：
- `addMemberFromAgent(teamName, agentInstance)`: 调用 `clawteam team add-member <team> <agent.name> --agent-id <agent.id>`
- `removeMember(teamName, memberName)`: 如果 ClawTeam 支持移除 member（需验证），或直接操作 config.json

### Task 3: 新增绑定 API 路由

**新建 `src/app/api/teams/[name]/bind-agent/route.ts`**：
- `POST`: 接收 `{ agentId: string }`，查找 agent 实例，调用 `addMemberFromAgent`，同时更新 agent store 的 teamBindings
- `DELETE`: 接收 `{ agentId: string }`，解除绑定

### Task 4: Team 详情页增加"绑定已有 Agent"功能

**修改 `src/app/teams/[name]/agents/page.tsx`**：
- 现有的 "Add Agent" 改为两个入口：
  - **"Spawn New Agent"**（现有逻辑，通过 ClawTeam spawn 创建全新 agent）
  - **"Bind Existing Agent"**（新功能）：弹出 Dialog，列出 nanocats-manager 中所有未绑定到该 team 的 agent 实例，选择后调用绑定 API
- 成员列表中，已绑定的 agent 显示额外信息（端口、状态、"View in Agents" 快捷链接）

### Task 5: Agent 详情页增加 Team 绑定信息

**修改 `src/app/agents/[id]/page.tsx`**：
- 在 Agent 详情卡片中新增一行 "Teams"，显示该 agent 绑定的所有 team（可点击跳转到 team 详情）
- 如果未绑定任何 team，显示 "Not in any team" + "Add to Team" 按钮

### Task 6: Agent Store 增加绑定状态持久化

**修改 `src/lib/store.ts`**：
- `updateAgentTeamBindings(agentId, bindings)`: 更新 agent 的 team 绑定信息
- 绑定信息持久化到 `agents-store.json`

---

## 四、数据流示意

```
用户在 Team 成员页点击 "Bind Existing Agent"
  |
  v
前端: 调用 GET /api/agents 获取 agent 列表 -> 用户选择 agent
  |
  v
前端: 调用 POST /api/teams/{name}/bind-agent { agentId: "xxx" }
  |
  v
后端:
  1. 从 store 获取 AgentInstance (name, id)
  2. 调用 clawteam team add-member {teamName} {agent.name} --agent-id {agent.id}
  3. 更新 store 中 agent 的 teamBindings
  4. 返回成功
```

---

## 五、已知限制

1. **Leader 不可更改**: ClawTeam 的 team leader 在 `spawn-team` 时固定，不能事后改为已有 agent
2. **协调功能受限**: 已绑定的 agent 不会自动接收 ClawTeam 注入的协作提示词（仅通过 spawn 启动的 agent 才有），需要用户手动通过 workspace 配置协作规则
3. **进程独立管理**: ClawTeam 的 `board attach`（tmux 视图）无法看到由 nanocats-manager 启动的 agent 进程
4. **单向同步**: 如果在 ClawTeam CLI 中直接操作 team member，nanocats-manager 的 store 不会自动同步
