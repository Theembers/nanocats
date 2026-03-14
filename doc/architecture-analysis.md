# Nanocats 项目架构分析报告

> 分析日期：2026-03-14
> 分析方式：从源代码独立分析，不参考已有文档
> **重要更新**：本报告包含最新的 Agent Session 设计（2026-03-14 澄清版）

---

## 1. 整体架构概览

Nanocatspancats 是一个基于 Python asyncio 的多渠道 AI 助手框架。核心采用 **MessageBus** 解耦组件，支持 Telegram、Discord、Slack、飞书、钉钉、WhatsApp、QQ、Email、Matrix、企业微信、Web 等多渠道接入。

### 1.1 核心启动流程

从 `gateway` 命令入口（`cli/commands.py:408`）:

```python
# 核心组件初始化
bus = MessageBus()                                    # 消息总线
agent = AgentLoop(bus=bus, ...)                       # Agent 循环
channels = ChannelManager(config, bus)                # 渠道管理器

# 并发启动
asyncio.gather(
    agent.run(),           # Agent 处理消息
    channels.start_all(),  # 启动所有渠道
)
```

### 1.2 架构分层

```
┌─────────────────────────────────────────┐
│  Channels (多渠道接入层)                  │
│  telegram.py / slack.py / discord.py ... │
└──────────────────┬──────────────────────┘
                   │ publish_inbound()
                   ▼
┌─────────────────────────────────────────┐
│           MessageBus                    │
│    inbound queue ← outbound queue        │
└──────────────────┬──────────────────────┘
                   │ consume_inbound()
                   ▼
┌─────────────────────────────────────────┐
│           AgentLoop                      │
│    消息处理 / LLM 调用 / 工具执行         │
└──────────────────┬──────────────────────┘
                   │ publish_outbound()
                   ▼
┌─────────────────────────────────────────┐
│        ChannelManager                    │
│    出站消息分发到对应 Channel              │
└──────────────────┬──────────────────────┘
                   │ channel.send()
                   ▼
┌─────────────────────────────────────────┐
│  Channels (发送回复到用户)                 │
└─────────────────────────────────────────┘
```

---

## 2. 消息完整生命周期

### 2.1 从用户输入到获取结果

**Step 1: 用户在渠道发送消息**

以 Telegram 为例（`channels/telegram.py:641`）:
- 用户发送消息 → Telegram Bot API Long Polling
- `_on_message()` 处理消息

**Step 2: Channel 预处理并发布到总线**

```python
# channels/telegram.py:719
await self._handle_message(
    sender_id=sender_id,
    chat_id=str_chat_id,
    content=content,
    media=media_paths,
    metadata=metadata,
    session_key=session_key,
)
```

`BaseChannel._handle_message()` 执行权限校验并发布:

```python
# channels/base.py:89-129
async def _handle_message(self, sender_id, chat_id, content, ...):
    if not self.is_allowed(sender_id):
        return  # 权限校验
    
    msg = InboundMessage(
        channel=self.name,
        sender_id=str(sender_id),
        chat_id=str(chat_id),
        content=content,
        media=media or [],
        metadata=metadata or {},
        session_key_override=session_key,
    )
    await self.bus.publish_inbound(msg)
```

**Step 3: AgentLoop 消费消息**

```python
# agent/loop.py:256-270
while self._running:
    msg = await asyncio.wait_for(self.bus.consume_inbound(), timeout=1.0)
    
    cmd = msg.content.strip().lower()
    if cmd == "/stop":
        await self._handle_stop(msg)
    elif cmd == "/restart":
        await self._handle_restart(msg)
    else:
        task = asyncio.create_task(self._dispatch(msg))
```

**Step 4: 消息处理与 Session 管理**

```python
# agent/loop.py:302-322
async def _dispatch(self, msg: InboundMessage):
    async with self._processing_lock:
        response = await self._process_message(msg)
        if response is not None:
            await self.bus.publish_outbound(response)
```

核心处理逻辑（`agent/loop.py:369-437`）:
1. 获取或创建 Session: `session = self.sessions.get_or_create(key)`
2. 获取历史消息: `history = session.get_history(max_messages=0)`
3. 构建上下文: `initial_messages = self.context.build_messages(...)`
4. 运行 Agent 循环: `await self._run_agent_loop(initial_messages, ...)`
5. 保存 Session: `self.sessions.save(session)`

**Step 5: 出站消息路由回原渠道**

```python
# agent/loop.py:306-308
response = await self._process_message(msg)
# response 包含: response.channel, response.chat_id, response.content
await self.bus.publish_outbound(response)
```

**Step 6: ChannelManager 分发到对应 Channel**

```python
# channels/manager.py:130
channel = self.channels.get(msg.channel)  # 根据 channel 字段过滤
if channel:
    await channel.send(msg)  # 调用对应 channel 的 send 方法
```

**Step 7: Channel 发送回复到用户**

```python
# channels/telegram.py:316-327
async def send(self, msg: OutboundMessage):
    chat_id = int(msg.chat_id)
    await self.bot.send_message(chat_id=chat_id, text=msg.content, ...)
```

### 2.2 完整序列图

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  用户    │───▶│ Channel  │───▶│ MessageBus│───▶│AgentLoop │───▶│  LLM    │
│ (Telegram)│    │(telegram)│    │ inbound   │    │          │    │Provider │
└─────────┘    └──────────┘    └─────────┘    └──────────┘    └─────────┘
                                            │                      │
                                            │◀─────────────────────┘
                                            ▼
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│  用户    │◀───│ Channel  │◀───│ MessageBus│◀───│ChannelMgr│◀───│AgentLoop │
│ (Telegram)│    │(telegram)│    │ outbound  │    │          │    │          │
└─────────┘    └──────────┘    └─────────┘    └──────────┘    └─────────┘
```

---

## 3. 多渠道路由机制

### 3.1 Channel 注册与发现

通过 `ChannelRegistry` 自动发现（`channels/registry.py`）:

```python
def discover_all() -> dict[str, type[BaseChannel]]:
    builtin = {...}  # 扫描 nanocats.channels 包
    external = discover_plugins()  # 通过 entry_points 发现插件
    return {**external, **builtin}
```

### 3.2 渠道启动

```python
# channels/manager.py:75-91
async def start_all(self):
    # 启动出站分发器
    self._dispatch_task = asyncio.create_task(self._dispatch_outbound())
    
    # 启动每个渠道
    for name, channel in self.channels.items():
        await channel.start()  # 每个 channel 独立启动
```

### 3.3 路由关键：channel 字段

消息通过 `InboundMessage.channel` 和 `OutboundMessage.channel` 标识渠道:

```python
# bus/events.py
@dataclass
class InboundMessage:
    channel: str  # "telegram", "discord", "slack", ...
    sender_id: str
    chat_id: str
    ...

@dataclass  
class OutboundMessage:
    channel: str  # 必须与入站一致，才能路由回原渠道
    chat_id: str
    content: str
    ...
```

**路由回原渠道的关键代码**:
```python
# channels/manager.py:130
channel = self.channels.get(msg.channel)  # 根据 channel 名称过滤
if channel:
    await channel.send(msg)
```

---

## 4. Session 管理机制

### 4.1 Session 数据结构

```python
# session/manager.py
@dataclass
class Session:
    key: str                    # Session 唯一标识
    messages: list[dict]         # 消息历史
    created_at: datetime
    updated_at: datetime
    metadata: dict
    last_consolidated: int = 0  # 已整合到 memory 的消息数
```

### 4.2 Session Key 生成规则

**默认规则**（`bus/events.py:22-24`）:
```python
@property
def session_key(self) -> str:
    return self.session_key_override or f"{self.channel}:{self.chat_id}"
```

**格式**: `{channel}:{chat_id}`

| 渠道 | Session Key 示例 |
|------|-----------------|
| Telegram 私聊 | `telegram:123456789` |
| Telegram 群组 | `telegram:-100123456` |
| Telegram 话题 | `telegram:-100123:topic:42` |
| Slack 私聊 | `slack:U123456` |
| Slack 线程 | `slack:C123456:T123456` |
| Web | `web:session_abc123` |

### 4.3 特殊场景的 Session Key 覆盖

**Telegram 话题**（`channels/telegram.py:466-471`）:
```python
@staticmethod
def _derive_topic_session_key(message) -> str | None:
    if message.chat.type == "private" or message_thread_id is None:
        return None
    return f"telegram:{message.chat_id}:topic:{message_thread_id}"
```

**Slack 线程**（`channels/slack.py:217`）:
```python
session_key = f"slack:{chat_id}:{thread_ts}" if thread_ts and channel_type != "im" else None
```

**Web Channel**（`channels/web.py:108`）:
```python
session_key=session_id,  # 直接使用 WebSocket session_id
```

### 4.4 Session 存储

```python
# session/manager.py:86-89
def _get_session_path(self, key: str) -> Path:
    safe_key = safe_filename(key.replace(":", "_"))
    return self.sessions_dir / f"{safe_key}.jsonl"

# 存储格式: JSONL
# ~/.nanocats/workspaces/{workspace}/sessions/
```

---

## 5. 消息回路由机制

### 5.1 核心设计

消息通过 `OutboundMessage` 携带原渠道信息，实现精确路由:

```python
# agent/loop.py:445-448
return OutboundMessage(
    channel=msg.channel,    # 原渠道
    chat_id=msg.chat_id,    # 原聊天
    content=final_content,  # 回复内容
    metadata=msg.metadata or {},
)
```

### 5.2 ChannelManager 出站分发

```python
# channels/manager.py:113-137
async def _dispatch_outbound(self):
    while True:
        msg = await self.bus.consume_outbound()
        
        # 关键：根据 msg.channel 找到对应 Channel
        channel = self.channels.get(msg.channel)
        if channel:
            await channel.send(msg)
        else:
            logger.warning("Unknown channel: {}", msg.channel)
```

### 5.3 各 Channel 发送实现

每个 Channel 实现自己的 `send()` 方法:

- **Telegram**: 调用 `bot.send_message(chat_id, text)`
- **Slack**: 调用 `web_client.chat_postMessage(channel, text)`
- **Discord**: 调用 `channel.send(content)`
- 等等...

---

## 6. 跨渠道 Session 共享分析

### 6.1 当前实现状态

**结论：当前版本不支持跨渠道自动共享 Session。**

证据：
1. 每个渠道独立生成 Session Key: `{channel}:{chat_id}`
2. 没有找到 `unified_user` 或 `user_binding` 相关代码
3. `session_key_override` 仅用于线程/话题隔离，不用于跨渠道融合

### 6.2 手动跨渠道融合机制

虽然不支持自动共享，但系统提供了 `session_key_override` 机制:

```python
# channels/base.py:119-127
msg = InboundMessage(
    channel=self.name,
    sender_id=str(sender_id),
    chat_id=str(chat_id),
    content=content,
    session_key_override=session_key,  # 可手动指定
)
```

**使用场景**:
- Telegram 话题: `telegram:{chat_id}:topic:{topic_id}`
- Slack 线程: `slack:{chat_id}:{thread_ts}`

**如需跨渠道共享**，用户可以:
1. 在配置或代码中硬编码 `session_key_override`
2. 例如：让 Telegram 和 Slack 用户使用同一个 `session_key`

### 6.3 Session 文件存储位置

```
~/.nanocats/workspaces/{workspace}/sessions/
├── telegram_123456789.jsonl    # Telegram 私聊
├── telegram_-100123.jsonl      # Telegram 群组  
├── slack_U123456.jsonl         # Slack 私聊
├── web_session_abc.jsonl       # Web 会话
└── ...
```

每个渠道的 Session 完全独立存储，无法自动共享。

---

## 7. 关键代码文件索引

| 文件 | 职责 |
|------|------|
| `cli/commands.py:408` | gateway 命令入口 |
| `bus/queue.py` | MessageBus 队列实现 |
| `bus/events.py` | InboundMessage / OutboundMessage 定义 |
| `channels/base.py` | BaseChannel 抽象基类 |
| `channels/manager.py` | ChannelManager 渠道管理 + 出站分发 |
| `channels/telegram.py` | Telegram Channel 实现示例 |
| `agent/loop.py` | AgentLoop 核心处理循环 |
| `session/manager.py` | SessionManager 会话管理 |
| `agent/context.py` | ContextBuilder 上下文构建 |

---

## 8. 总结

| 问题 | 答案 |
|------|------|
| **消息流转周期** | 用户 → Channel → MessageBus(inbound) → AgentLoop → LLM → MessageBus(outbound) → ChannelManager → Channel → 用户 |
| **多渠道路由** | 通过 `InboundMessage.channel` / `OutboundMessage.channel` 字段标识，ChannelManager 根据 channel 名称过滤并分发 |
| **Session 管理** | Session Key = `channel:chat_id`，存储在 `~/.nanocats/workspaces/{workspace}/sessions/` |
| **消息回路由** | Agent 处理后返回 `OutboundMessage` 携带原 `channel` 和 `chat_id`，ChannelManager 根据 channel 分发到对应 Channel |
| **跨渠道 Session 共享** | **不支持**。每个渠道独立 Session，可通过 `session_key_override` 手动指定统一 key |

---

# 附：全新 Agent Session 设计方案

> **设计日期**：2026-03-14
> **状态**：待实现

---

## 9. 设计原则（需废除当前设计）

**当前设计（废除）**：
- Session Key = `{channel}:{chat_id}`
- 每个 Channel+ChatId 独立 Session
- 存储路径：`~/.nanocats/workspaces/{workspace}/sessions/{channel}_{chat_id}.jsonl`

**新设计核心变化**：
1. Session Key 不再包含 Channel 信息
2. Session Key 由 **Agent 类型** 决定格式
3. 跨 Channel 共享 Session 通过 **sessionGroups** 配置

---

## 10. Agent 类型与 Session Key

| Agent 类型 | Session 隔离维度 | Session Key 格式 | 说明 |
|-----------|-----------------|------------------|------|
| **Admin** | 全局融合 | `global` | 全局唯一，所有渠道共享 |
| **User** | 基于配置隔离 | `user:{unified_user_id}` | 跨渠道共享由 sessionGroups 配置 |
| **Specialized** | Agent 隔离 | `agent:{caller_agent_id}` | Agent 与 Agent 对话 |
| **Task** | 任务隔离 | `task:{task_id}` | 每个任务独立 |

---

## 11. Channel vs ChatId vs Session 关系

### 11.1 概念澄清

| 概念 | 定义 | 示例 |
|------|------|------|
| **Channel** | 渠道类型 | `telegram`, `feishu`, `web` |
| **ChatId** | Channel 下的子分类 | 飞书群聊/私聊、Telegram 话题/私聊 |
| **Session** | 对话上下文 | 由 sessionGroups 配置决定哪些 ChatId 共享 |

### 11.2 关系图

```
Channel (渠道)
├── ChatId 1 (子分类) ──┐
├── ChatId 2 (子分类) ──┼──▶ 同一个 Session (通过 sessionGroups 配置)
└── ChatId 3 (子分类) ──┘

不同 Channel 的 ChatId 可以映射到同一个 Session
```

---

## 12. 隔离配置结构

### 12.1 Agent 配置文件位置

```
~/.nanocats/agents/{agentId}.json
```

### 12.2 完整配置示例

```json
{
  "id": "bro",
  "name": "Bro",
  "type": "user",
  "channels": {
    "configs": {
      "web": {
        "enabled": true,
        "allowFrom": ["user_web_id_1", "user_web_id_2"]
      },
      "feishu": {
        "enabled": true,
        "app_id": "cli_a92e839d19389bd1",
        "app_secret": "aiQpnx4Qj4AmxXUclkzF1cy72n7CNu04",
        "allowFrom": ["ou_06e5d52a64878fe2185075e08a2d81d2"],
        "reactEmoji": "THUMBSUP"
      },
      "telegram": {
        "enabled": true,
        "token": "xxx",
        "allowFrom": ["123456789"]
      }
    },
    "sessionGroups": [
      {
        "web": "user_web_id_1",
        "feishu": "ou_06e5d52a64878fe2185075e08a2d81d2"
      },
      {
        "web": "user_web_id_2",
        "telegram": "123456789"
      }
    ],
    "allowAgents": ["code_reviewer", "data_analyst"]
  },
  "sessionPolicy": "per_user",
  "model": "anthropic/claude-opus-4-5",
  "provider": "anthropic"
}
```

### 12.3 配置字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Agent 唯一标识 |
| `name` | string | Agent 显示名称 |
| `type` | string | Agent 类型：`admin`/`user`/`specialized`/`task` |
| `channels.configs` | object | 各 Channel 的独立配置 |
| `channels.configs.{channel}.enabled` | boolean | Channel 是否启用 |
| `channels.configs.{channel}.allowFrom` | array | 允许访问的 ChatId 列表 |
| `channels.sessionGroups` | array | Session 分组配置 |
| `channels.sessionGroups[]` | object | 一个 Session 组，key=channel，value=chatId |
| `channels.allowAgents` | array | 允许与此 Agent 对话的其他 Agent ID 列表 |
| `sessionPolicy` | string | Session 策略：`global`/`per_user`/`per_agent`/`per_task` |

---

## 13. Session Key 解析与路由

### 13.1 Session Key 生成逻辑

```python
def generate_session_key(
    agent_type: str,
    unified_user_id: str | None,
    caller_agent_id: str | None,
    task_id: str | None,
    channel: str,
    chat_id: str,
    session_groups: list[dict],
) -> str:
    
    if agent_type == "admin":
        return "global"
    
    elif agent_type == "user":
        return f"user:{unified_user_id}"
    
    elif agent_type == "specialized":
        return f"agent:{caller_agent_id}"
    
    elif agent_type == "task":
        return f"task:{task_id}"
    
    raise ValueError(f"Unknown agent type: {agent_type}")
```

### 13.2 ChatId → Session Group 映射

```python
def resolve_session_group(
    channel: str,
    chat_id: str,
    session_groups: list[dict],
) -> str | None:
    for idx, group in enumerate(session_groups):
        if channel in group and group[channel] == chat_id:
            return f"group_{idx}"
    return None
```

---

## 14. 消息流程改造

```
用户消息 (channel + chat_id)
    │
    ▼
1. Agent 配置查找
   根据 channel + chat_id 查找对应的 Agent 和 sessionGroup
    │
    ▼
2. Session Key 生成
   agent_type + unified_user_id → user:zhangsan
    │
    ▼
3. 路由到目标 Agent
   AgentLoop(agent_id, workspace)
    │
    ▼
4. Session 获取/创建
   session = sm.get_or_create(key)
```

---

## 15. Session 存储结构改造

### 15.1 新存储路径

```
~/.nanocats/workspaces/{agent_id}/sessions/
├── global.jsonl
├── user_zhangsan.jsonl
├── user_lisi.jsonl
├── agent_code_reviewer.jsonl
└── task_abc123.jsonl
```

---

## 16. 总结

| 设计点 | 实现方式 |
|--------|---------|
| Session Key 格式 | `global` / `user:{unified_user_id}` / `agent:{agent_id}` / `task:{task_id}` |
| 跨 Channel 共享 | 通过 `sessionGroups` 配置映射 |
| ChatId 验证 | `allowFrom` 白名单 |
| Agent 查找 | Channel → ChatId → Agent 配置 → sessionGroup |
| Session 存储 | `~/.nanocats/workspaces/{agent_id}/sessions/{session_key}.jsonl` |

---

*设计文档版本：v2.0 - 2026-03-14*
