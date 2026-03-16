# 渠道多实例支持 - 架构改造方案

> **注意**：本方案不考虑配置兼容性，旧配置需要手动迁移到新格式。

---

## 1. 背景与需求

### 1.1 需求场景

用户需要同时运行多个同一类型的渠道机器人，每个机器人对应不同的 Agent：

- 飞书机器人 A（app_id_1）→ Agent Alpha
- 飞书机器人 B（app_id_2）→ Agent Beta
- Telegram Bot A → Agent X
- Telegram Bot B → Agent Y

### 1.2 当前架构限制

当前架构按**渠道类型**创建**单个实例**：

```python
# channels/manager.py
self.channels: dict[str, BaseChannel] = {}  # key 是 "feishu", "telegram"
```

- 无法同时运行多个飞书/Telegram 机器人
- 所有 Agent 共享同一渠道连接

---

## 2. 目标架构

### 2.1 核心思路

**不再区分"渠道类型"和"渠道实例"**，直接用实例 ID 作为唯一标识。

### 2.2 配置结构

**全局配置**：

```json
{
  "channels": {
    "feishu:customer_service": {
      "enabled": true,
      "type": "feishu",
      "app_id": "cli_xxx1",
      "app_secret": "xxx1"
    },
    "feishu:internal": {
      "enabled": true,
      "type": "feishu",
      "app_id": "cli_xxx2",
      "app_secret": "xxx2"
    },
    "telegram:main": {
      "enabled": true,
      "type": "telegram",
      "token": "xxx"
    }
  }
}
```

- **key** 是实例 ID：`feishu:customer_service`、`telegram:main`
- **type** 字段指明渠道类型，用于加载对应的 Channel 类

### 2.3 Agent 配置

```json
{
  "id": "agent_alpha",
  "channels": {
    "configs": {
      "feishu:customer_service": {
        "enabled": true,
        "allowFrom": ["ou_xxx", "oc_yyy"]
      }
    }
  }
}
```

- Agent 直接绑定实例 ID

### 2.4 内部数据结构

```python
# ChannelManager
self.channels: dict[str, BaseChannel] = {
    "feishu:customer_service": FeishuChannel(...),
    "feishu:internal": FeishuChannel(...),
    "telegram:main": TelegramChannel(...)
}
```

- key 直接是实例 ID
- 不再使用 `dict[str, list[Channel]]`

---

## 3. 改动方案

### 3.1 配置层 (config/schema.py)

新增渠道配置基类，包含 `type` 字段：

```python
class ChannelInstanceConfig(Base):
    """渠道实例配置"""
    type: str  # 渠道类型：feishu, telegram, discord 等
    enabled: bool = False

class ChannelsConfig(Base):
    """全局渠道配置"""
    model_config = ConfigDict(extra="allow")
    send_progress: bool = True
    send_tool_hints: bool = False
```

各渠道配置继承 `ChannelInstanceConfig`：

```python
class FeishuConfig(ChannelInstanceConfig):
    """飞书渠道配置"""
    type: str = "feishu"
    app_id: str = ""
    app_secret: str = ""
    encrypt_key: str = ""
    verification_token: str = ""
    react_emoji: str = "Typing"
    group_policy: Literal["open", "mention"] = "mention"

class TelegramConfig(ChannelInstanceConfig):
    """Telegram 渠道配置"""
    type: str = "telegram"
    token: str = ""
    proxy: str | None = None
    reply_to_message: bool = False
    group_policy: Literal["open", "mention"] = "mention"
```

### 3.2 渠道注册表 (channels/registry.py)

修改渠道发现逻辑，从配置 key 获取实例 ID：

```python
# 旧
def discover_all() -> dict[str, type[BaseChannel]]:
    return {cls.name: cls for cls in BaseChannel.__subclasses__()}

# 新：返回 (instance_id, cls) 映射
def discover_all(config: ChannelsConfig) -> dict[str, type[BaseChannel]]:
    result = {}
    for name, value in config.model_dump().items():
        if name in ("send_progress", "send_tool_hints"):
            continue
        if isinstance(value, dict) and value.get("enabled"):
            channel_type = value.get("type", name.split("_")[0])  # 兼容旧配置
            cls = CHANNEL_REGISTRY.get(channel_type)
            if cls:
                result[name] = cls  # key = 实例ID，如 "feishu:customer_service"
    return result
```

### 3.3 渠道管理层 (channels/manager.py)

简化为直接用实例 ID 作为 key：

```python
class ChannelManager:
    def __init__(self, ...):
        self.channels: dict[str, BaseChannel] = {}  # key = 实例ID

    def _init_channels(self):
        from nanocats.channels.registry import discover_all
        
        all_channels = discover_all(self.config.channels)
        
        for instance_id, cls in all_channels.items():
            section = getattr(self.config.channels, instance_id)
            if not section.enabled:
                continue
            
            # 创建实例，传入实例 ID
            channel = cls(section, self.bus, self.agent_registry)
            channel.instance_id = instance_id  # 注入实例 ID
            self.channels[instance_id] = channel
```

### 3.4 Agent 路由 (agent/registry.py)

直接精确匹配实例 ID：

```python
def find_by_channel(self, channel: str, chat_id: str) -> tuple[AgentConfig, str | None] | None:
    """channel = 实例ID，如 feishu:customer_service"""
    for agent in self._agents.values():
        channel_cfg = agent.channels.configs.get(channel)
        if not channel_cfg or not channel_cfg.enabled:
            continue
        
        if not self._is_chat_allowed(channel_cfg, chat_id):
            continue
        
        group_id = self._find_session_group(agent, channel, chat_id)
        return agent, group_id
    
    return None
```

### 3.5 渠道基类 (channels/base.py)

添加 `instance_id` 属性：

```python
class BaseChannel(ABC):
    name: str = "base"  # 渠道类型名：feishu, telegram
    instance_id: str = ""  # 实例ID：feishu:customer_service
    
    def __init__(self, config, bus, agent_registry=None):
        self.config = config
        self.instance_id = config.instance_id if hasattr(config, 'instance_id') else ""
```

### 3.6 各渠道实现

各渠道 Config 类添加 `instance_id` 和 `type` 字段：

```python
# 示例：feishu.py
class FeishuConfig(ChannelInstanceConfig):
    type: str = "feishu"
    instance_id: str = ""  # 运行时注入
    app_id: str = ""
    app_secret: str = ""
    # ...

class FeishuChannel(BaseChannel):
    name = "feishu"
    
    def __init__(self, config, bus, agent_registry=None):
        if isinstance(config, dict):
            config = FeishuConfig.model_validate(config)
        super().__init__(config, bus, agent_registry)
        self.config: FeishuConfig = config
        self.instance_id = config.instance_id or config.type  # fallback
```

其他渠道同理修改：`TelegramConfig`, `DiscordConfig`, `SlackConfig` 等。

---

## 4. 配置示例

### 4.1 全局配置

```json
{
  "channels": {
    "feishu:customer_service": {
      "type": "feishu",
      "enabled": true,
      "app_id": "cli_aaa",
      "app_secret": "secret_aaa",
      "react_emoji": "👍"
    },
    "feishu:internal": {
      "type": "feishu",
      "enabled": true,
      "app_id": "cli_bbb",
      "app_secret": "secret_bbb",
      "react_emoji": "👀"
    },
    "telegram:main": {
      "type": "telegram",
      "enabled": true,
      "token": "xxx"
    },
    "telegram:alerts": {
      "type": "telegram",
      "enabled": true,
      "token": "yyy"
    }
  }
}
```

### 4.2 Agent 配置

**客服 Agent**：

```json
{
  "id": "customer_service",
  "name": "客服助手",
  "channels": {
    "configs": {
      "feishu:customer_service": {
        "enabled": true,
        "allowFrom": ["ou_customer_1", "ou_customer_2"]
      }
    }
  }
}
```

**内部助手 Agent**：

```json
{
  "id": "internal_helper",
  "name": "内部助手",
  "channels": {
    "configs": {
      "feishu:internal": {
        "enabled": true,
        "allowFrom": ["ou_employee_1"]
      },
      "telegram:main": {
        "enabled": true,
        "allowFrom": ["123456789"]
      }
    }
  }
}
```

**监控告警 Agent**：

```json
{
  "id": "alerts",
  "name": "告警机器人",
  "channels": {
    "configs": {
      "telegram:alerts": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    }
  }
}
```

---

## 5. 影响范围

### 5.1 需要修改的文件

| 优先级 | 文件 | 改动 |
|--------|------|------|
| P0 | `config/schema.py` | 新增 `ChannelInstanceConfig` 基类 |
| P0 | `channels/registry.py` | 渠道发现逻辑，按配置 key 加载 |
| P0 | `channels/manager.py` | 实例管理，移除类型聚合 |
| P0 | `channels/base.py` | 添加 `instance_id` 属性 |
| P0 | `agent/registry.py` | `find_by_channel()` 精确匹配 |
| P1 | `channels/feishu.py` | 添加 `type`/`instance_id` 字段 |
| P1 | `channels/telegram.py` | 同上 |
| P1 | `channels/discord.py` | 同上 |
| P1 | `channels/slack.py` | 同上 |
| P1 | `channels/dingtalk.py` | 同上 |
| P1 | `channels/qq.py` | 同上 |
| P1 | `channels/wecom.py` | 同上 |
| P1 | `channels/whatsapp.py` | 同上 |
| P1 | `channels/email.py` | 同上 |
| P1 | `channels/web.py` | 同上 |
| P1 | `channels/mochat.py` | 同上 |
| P2 | `cli/commands.py` | 配置加载调整 |

### 5.2 无需改动的文件

- `bus/events.py` - `InboundMessage.channel` 语义不变
- `agent/config.py` - Agent 配置解析逻辑无需改动

---

## 6. 实施计划

### 阶段一：基础设施（P0）
1. `config/schema.py` - 新增 `ChannelInstanceConfig`
2. `channels/base.py` - 添加 `instance_id` 属性

### 阶段二：核心逻辑（P0）
3. `channels/registry.py` - 修改渠道发现逻辑
4. `channels/manager.py` - 实例管理
5. `agent/registry.py` - 路由匹配

### 阶段三：渠道实现（P1）
6. 逐个修改 12 个渠道的 Config 类

### 阶段四：验证（P2）
7. 端到端测试

---

## 7. 设计原则

1. **实例 ID 即 key**：`feishu:customer_service` 就是唯一标识
2. **配置 key = 实例 ID**：不再有类型→实例的映射关系
3. **Agent 直接绑定实例**：不需要通配符匹配
4. **简单优先**：不需要考虑旧配置兼容
5. **命名格式**：`{类型}:{用途}`，用冒号分隔

---

## 8. 附录

### 8.1 实例 ID 命名规范

推荐命名格式：
- `{渠道类型}:{用途}`，如 `feishu:customer_service`、`telegram:alerts`
- 也可以自定义，只要全局唯一

### 8.2 各渠道 type 字段值

| 渠道 | type 值 |
|------|---------|
| 飞书 | `feishu` |
| Telegram | `telegram` |
| Discord | `discord` |
| Slack | `slack` |
| 钉钉 | `dingtalk` |
| QQ | `qq` |
| 企业微信 | `wecom` |
| WhatsApp | `whatsapp` |
| Email | `email` |
| Web | `web` |
| MoChat | `mochat` |
| Matrix | `matrix` |

### 8.3 日志示例

```
[ChannelManager] Initializing channels from config
[FeishuChannel:feishu:customer_service] Starting...
[FeishuChannel:feishu:internal] Starting...
[TelegramChannel:telegram:main] Starting...
[Channel] inbound: channel=feishu:customer_service, sender_id=ou_xxx, chat_id=oc_yyy
[AgentRegistry] find_by_channel(channel=feishu:customer_service, chat_id=oc_yyy)
```
