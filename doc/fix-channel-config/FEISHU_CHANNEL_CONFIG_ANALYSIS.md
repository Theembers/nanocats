# 飞书渠道配置识别机制分析

本文档详细分析消息从飞书渠道进入后，到 Agent 回复消息后转发回飞书的整个过程中，渠道配置是如何被识别和使用的。

## 1. 整体架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              消息流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   飞书 ──消息──> FeishuChannel ──InboundMessage──> MessageBus ──> Agent   │
│                              │                              │                │
│                              │                              │                │
│                              ▼                              ▼                │
│                        渠道配置识别                   Agent 处理              │
│                                                                             │
│   飞书 <──消息── FeishuChannel <──OutboundMessage─── MessageBus <── Agent  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. 配置层级结构

渠道配置分为三个层级：

### 2.1 全局配置 (Main Config)

**位置**: `~/.nanocats/config.json` → `channels` 字段

**用途**: 定义渠道的连接凭证和全局设置

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "app_id": "cli_xxx",
      "app_secret": "xxx",
      "encrypt_key": "",
      "verification_token": "",
      "allow_from": ["ou_xxx"],
      "react_emoji": "Typing",
      "group_policy": "mention"
    }
  }
}
```

### 2.2 Agent 配置 (Per-Agent Config)

**位置**: `~/.nanocats/agents/{agent_id}.json` → `channels.configs` 字段

**用途**: 定义特定 Agent 允许使用该渠道的聊天 ID 列表

```json
{
  "id": "my_agent",
  "channels": {
    "configs": {
      "feishu": {
        "enabled": true,
        "allowFrom": ["ou_xxx", "oc_xxx"]
      }
    }
  }
}
```

### 2.3 配置字段对照表

| 字段 | 层级 | 来源 | 说明 |
|------|------|------|------|
| `enabled` | 全局/Agent | `ChannelConfig` | 是否启用该渠道 |
| `app_id` | 全局 | `FeishuConfig` | 飞书应用 ID |
| `app_secret` | 全局 | `FeishuConfig` | 飞书应用密钥 |
| `encrypt_key` | 全局 | `FeishuConfig` | 加密密钥 |
| `verification_token` | 全局 | `FeishuConfig` | 验证令牌 |
| `allow_from` | 全局/Agent | `ChannelConfig` | 允许发送消息的用户 ID 列表 |
| `react_emoji` | 全局 | `FeishuConfig` | 收到消息时显示的 emoji |
| `group_policy` | 全局 | `FeishuConfig` | 群消息策略：`open` 或 `mention` |
| `extra` | Agent | `ChannelConfig` | 额外的渠道配置 |

## 3. 配置识别流程详解

### 3.1 渠道初始化阶段 (Gateway 启动)

**入口**: `nanocats gateway` 命令

```python
# nanocats/cli/commands.py
def gateway(...):
    config = _load_runtime_config(config, workspace)
    bus = MessageBus()
    provider = _make_provider(config)
    swarm = SwarmManager(bus=bus, provider=provider)
    channel_manager = ChannelManager(config, bus, agent_registry=swarm.registry)
```

#### 第一步：ChannelManager 初始化

```python
# nanocats/channels/manager.py
class ChannelManager:
    def __init__(self, config: Config, bus: MessageBus, agent_registry=None):
        self.config = config
        self.bus = bus
        self.agent_registry = agent_registry
        self.channels: dict[str, BaseChannel] = {}
        self._init_channels()  # 关键方法
```

#### 第二步：渠道发现与配置合并 (`_init_channels`)

```python
# nanocats/channels/manager.py
def _init_channels(self):
    from nanocats.channels.registry import discover_all
    
    groq_key = self.config.providers.groq.api_key
    all_channels = discover_all()  # 发现所有渠道类
    
    enabled_channels: dict[str, dict] = {}
    
    # 1. 首先从全局配置获取渠道配置
    for name, cls in all_channels.items():
        section = getattr(self.config.channels, name, None)
        if section is None:
            continue
        
        channel_config = {}
        if isinstance(section, dict):
            channel_config = dict(section)
            enabled = section.get("enabled", False)
        else:
            channel_config = section.model_dump()
            enabled = getattr(section, "enabled", False)
        
        if enabled:
            enabled_channels[name] = channel_config
    
    # 2. 然后从 Agent 配置合并额外配置
    if self.agent_registry:
        for agent_config in self.agent_registry.get_all().values():
            for ch_name, ch_config in agent_config.channels.configs.items():
                if ch_config.enabled:
                    if ch_name not in enabled_channels:
                        enabled_channels[ch_name] = {}
                    else:
                        base_cfg = enabled_channels[ch_name].copy()
                        enabled_channels[ch_name] = base_cfg
                    
                    # 合并 extra 配置
                    if isinstance(ch_config.extra, dict):
                        enabled_channels[ch_name].update(ch_config.extra)
                    
                    # 合并 allow_from
                    if ch_config.allow_from:
                        enabled_channels[ch_name]["allow_from"] = ch_config.allow_from
                    
                    # 确保 enabled 为 True
                    if "enabled" not in enabled_channels[ch_name]:
                        enabled_channels[ch_name]["enabled"] = True
    
    # 3. 创建渠道实例
    for name, channel_config in enabled_channels.items():
        cls = all_channels.get(name)
        if not cls:
            continue
        
        enabled = channel_config.get("enabled", False)
        if not enabled:
            continue
        
        # 创建渠道实例，传入配置
        channel = cls(channel_config, self.bus, self.agent_registry)
        channel.transcription_api_key = groq_key  # 设置转录 API Key
        self.channels[name] = channel
```

**关键逻辑**:
1. **优先级**: Agent 配置中的 `allow_from` **覆盖** 全局配置
2. **合并策略**: 全局配置作为基础，Agent 配置的 `extra` 字段会合并进去

#### 第三步：FeishuChannel 实例化

```python
# nanocats/channels/feishu.py
class FeishuChannel(BaseChannel):
    def __init__(self, config: Any, bus: MessageBus, agent_registry=None):
        if isinstance(config, dict):
            config = FeishuConfig.model_validate(config)  # 将 dict 转为 FeishuConfig
        super().__init__(config, bus, agent_registry)
        self.config: FeishuConfig = config
```

**配置类定义**:
```python
# nanocats/channels/feishu.py
class FeishuConfig(Base):
    enabled: bool = False
    app_id: str = ""
    app_secret: str = ""
    encrypt_key: str = ""
    verification_token: str = ""
    allow_from: list[str] = Field(default_factory=list)
    react_emoji: str = "Typing"
    group_policy: Literal["open", "mention"] = "mention"
```

### 3.2 消息接收阶段

#### 消息接收流程

```
飞书 WebSocket ──> _on_message() ──> _handle_message() ──> MessageBus
```

#### 第一步：接收飞书消息 (`_on_message`)

```python
# nanocats/channels/feishu.py
async def _on_message(self, data: Any) -> None:
    event = data.event
    message = event.message
    sender = event.sender
    
    # 提取关键信息
    message_id = message.message_id
    sender_id = sender.sender_id.open_id  # 发送者 Open ID
    chat_id = message.chat_id              # 会话 ID
    chat_type = message.chat_type          # "group" 或 "p2p"
    msg_type = message.message_type         # "text", "post", "image" 等
```

#### 第二步：权限检查 (`_handle_message` → `is_allowed`)

```python
# nanocats/channels/base.py
def is_allowed(self, sender_id: str) -> bool:
    """检查 sender_id 是否在允许列表中"""
    allow_list = getattr(self.config, "allow_from", [])
    if not allow_list:
        logger.warning("{}: allow_from is empty — all access denied", self.name)
        return False
    if "*" in allow_list:
        return True
    return str(sender_id) in allow_list
```

**注意**: 这里的 `allow_from` 是**从渠道实例的 config 中获取的**，即已经经过合并的最终配置。

#### 第三步：Agent 路由 (`_resolve_agent_info`)

```python
# nanocats/channels/base.py
async def _resolve_agent_info(self, msg: InboundMessage) -> None:
    if not self.agent_registry:
        return
    
    # 查找该 channel + chat_id 对应的 Agent
    result = self.agent_registry.find_by_channel(msg.channel, msg.chat_id)
    if result:
        agent, group_id = result
        # 设置 msg 的 agent 信息
        msg.agent_id = agent.id
        msg.agent_type = agent.type.value
        msg._session_key = session_key
        msg.session_group_id = group_id
```

#### 第四步：发送到 MessageBus

```python
# nanocats/channels/base.py
async def _handle_message(self, ...):
    if not self.is_allowed(sender_id):
        return  # 拒绝访问
    
    msg = InboundMessage(
        channel=self.name,
        sender_id=str(sender_id),
        chat_id=str(chat_id),
        content=content,
        media=media or [],
        metadata=msg_metadata,
        session_key_override=session_key,
        agent_id=agent_id,
    )
    
    await self.bus.publish_inbound(msg)
```

### 3.3 消息发送阶段

#### Agent 处理后发送消息流程

```
Agent ──> OutboundMessage ──> MessageBus ──> ChannelManager._dispatch_outbound() ──> FeishuChannel.send()
```

#### 第一步：分发消息 (`_dispatch_outbound`)

```python
# nanocats/channels/manager.py
async def _dispatch_outbound(self) -> None:
    while True:
        msg = await asyncio.wait_for(self.bus.consume_outbound(), timeout=1.0)
        
        # 根据 msg.channel 获取对应渠道
        channel = self.channels.get(msg.channel)
        if channel:
            await channel.send(msg)
```

#### 第二步：飞书发送消息 (`FeishuChannel.send`)

```python
# nanocats/channels/feishu.py
async def send(self, msg: OutboundMessage) -> None:
    if not self._client:
        logger.warning("Feishu client not initialized")
        return
    
    # 使用 msg.chat_id 作为接收者
    receive_id_type = "chat_id" if msg.chat_id.startswith("oc_") else "open_id"
    
    # 发送媒体文件（图片、文件等）
    for file_path in msg.media:
        ...
    
    # 发送文本内容
    if msg.content and msg.content.strip():
        fmt = self._detect_msg_format(msg.content)
        # 根据内容格式选择发送方式
        if fmt == "text":
            ...
        elif fmt == "post":
            ...
        else:
            ...
```

**关键配置使用**:
- `self._client`: 使用 `app_id` 和 `app_secret` 初始化
- `self.config.react_emoji`: 在收到消息时添加的反应 emoji

## 4. 默认配置来源

### 4.1 BaseChannel 默认配置

```python
# nanocats/channels/base.py
class BaseChannel(ABC):
    @classmethod
    def default_config(cls) -> dict[str, Any]:
        """Return default config for onboard. Override in plugins to auto-populate config.json."""
        return {"enabled": False}
```

### 4.2 FeishuChannel 默认配置

```python
# nanocats/channels/feishu.py
class FeishuChannel(BaseChannel):
    @classmethod
    def default_config(cls) -> dict[str, Any]:
        return FeishuConfig().model_dump(by_alias=True)
```

### 4.3 配置加载时的默认值

当配置文件中没有指定某个字段时，使用 Pydantic 模型的默认值：

| 字段 | 默认值 |
|------|--------|
| `enabled` | `False` |
| `allow_from` | `[]` (空列表) |
| `react_emoji` | `"Typing"` |
| `group_policy` | `"mention"` |
| `encrypt_key` | `""` |
| `verification_token` | `""` |

## 5. 配置使用场景汇总

| 场景 | 使用配置 | 配置层级 |
|------|----------|----------|
| 初始化飞书 SDK | `app_id`, `app_secret`, `encrypt_key`, `verification_token` | 全局 |
| WebSocket 连接 | `app_id`, `app_secret` | 全局 |
| 权限检查 | `allow_from` | 合并后 (Agent 覆盖全局) |
| Agent 路由 | `channels.configs.{channel}.enabled`, `allow_from` | Agent |
| 消息处理策略 | `group_policy`, `react_emoji` | 全局 |
| 发送消息格式 | (无配置，使用代码逻辑) | - |
| 媒体上传 | `app_id`, `app_secret` (通过 client) | 全局 |

## 6. 配置优先级总结

```
Agent 配置 (allow_from, extra)  >  全局配置 (channels.feishu)
```

**合并逻辑**:
1. 全局配置作为基础
2. Agent 的 `extra` 字段会覆盖/添加全局配置
3. Agent 的 `allow_from` 会**覆盖**全局的 `allow_from`

## 7. 关键代码路径

```
启动流程:
  gateway() 
    → ChannelManager.__init__()
      → _init_channels()
        → discover_all()  # 发现所有渠道
        → 读取 self.config.channels.feishu  # 全局配置
        → 读取 agent.channels.configs.feishu  # Agent 配置
        → 合并配置
        → FeishuChannel(config, bus, agent_registry)

消息接收:
  WebSocket 消息
    → FeishuChannel._on_message()
      → FeishuChannel._handle_message()
        → BaseChannel.is_allowed()  # 使用合并后的 allow_from
        → BaseChannel._resolve_agent_info()  # 查找对应 Agent
        → MessageBus.publish_inbound()

消息发送:
  Agent 处理完成
    → MessageBus.publish_outbound()
      → ChannelManager._dispatch_outbound()
        → FeishuChannel.send()
          → 使用 app_id/app_secret 创建的 client 发送消息
```

## 8. 注意事项

1. **`allow_from` 为空时**: 所有用户都会被拒绝访问
2. **`allow_from` 包含 `"*"` 时**: 允许所有用户访问
3. **群组消息**: 受 `group_policy` 控制
   - `"open"`: 接收所有群消息
   - `"mention"`: 仅接收 @机器人 的群消息
4. **Agent 路由**: 使用 `chat_id`（而非 `sender_id`）来匹配 Agent 配置
5. **配置合并时机**: 仅在 Gateway 启动时合并，运行时不动态更新
