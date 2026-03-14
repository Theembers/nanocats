# Nanocats Agent Swarm 架构实现方案

> 版本：v1.0
> 日期：2026-03-14
> 状态：**待实现**

---

## 1. 概述

本文档描述如何将 nanocats 从单 Agent 架构改造为 **Agent Swarm** 架构，支持多 Agent 类型、独立工作空间隔离、灵活的 Session 共享配置。

---

## 2. 核心概念定义

### 2.1 Agent 类型

| Agent 类型 | Session Key 格式 | 隔离维度 | 工作空间 |
|-----------|-----------------|---------|---------|
| **Admin** | `global` | 全局唯一 | `~/.nanocats/workspaces/{agent_id}/` |
| **User** | `user:{groupId}` | Session Group 隔离 | `~/.nanocats/workspaces/{agent_id}/` |
| **Specialized** | `agent:{caller_agent_id}` | Agent 间隔离 | `~/.nanocats/workspaces/{agent_id}/` |
| **Task** | `task:{task_id}` | 任务级隔离 | 无（临时） |

### 2.2 Channel vs ChatId vs SessionGroup

```
Channel (渠道类型)
├── ChatId 1 ──┐
├── ChatId 2 ──┼──▶ 同一个 SessionGroup ──▶ 同一个 Session
└── ChatId 3 ──┘

不同 Channel 的不同 ChatId 可以通过 sessionGroups 配置映射到同一个 Session
```

---

## 3. 配置结构

### 3.1 Agent 配置文件位置

```
~/.nanocats/agents/{agent_id}.json
```

### 3.2 完整配置 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "type"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Agent 唯一标识"
    },
    "name": {
      "type": "string",
      "description": "Agent 显示名称"
    },
    "type": {
      "type": "string",
      "enum": ["admin", "user", "specialized", "task"],
      "description": "Agent 类型"
    },
    "channels": {
      "type": "object",
      "properties": {
        "configs": {
          "type": "object",
          "description": "各 Channel 的配置",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "enabled": {
                "type": "boolean",
                "description": "Channel 是否启用"
              },
              "allowFrom": {
                "type": "array",
                "items": {"type": "string"},
                "description": "允许访问的 ChatId 列表"
              }
            }
          }
        },
        "sessionGroups": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["groupId", "chatIds"],
            "properties": {
              "groupId": {
                "type": "string",
                "description": "Session Group 唯一标识"
              },
              "chatIds": {
                "type": "object",
                "description": "Channel 到 ChatId 的映射",
                "additionalProperties": {"type": "string"}
              }
            }
          },
          "description": "Session 分组配置"
        },
        "allowAgents": {
          "type": "array",
          "items": {"type": "string"},
          "description": "允许与此 Agent 对话的其他 Agent ID"
        }
      }
    },
    "sessionPolicy": {
      "type": "string",
      "enum": ["global", "per_user", "per_agent", "per_task"],
      "description": "Session 隔离策略"
    },
    "model": {
      "type": "string",
      "description": "使用的模型"
    },
    "provider": {
      "type": "string",
      "description": "LLM Provider 名称"
    },
    "ttl": {
      "type": ["integer", "null"],
      "description": "Session 过期时间（秒）"
    },
    "autoStart": {
      "type": "boolean",
      "description": "是否随 Gateway 自动启动"
    },
    "boundUserKey": {
      "type": ["string", "null"],
      "description": "绑定的用户 key"
    },
    "token": {
      "type": "string",
      "description": "API Token"
    },
    "routing": {
      "type": "object",
      "description": "路由配置"
    }
  }
}
```

### 3.3 配置示例

#### 3.3.1 Admin Agent 配置

```json
{
  "id": "admin",
  "name": "Admin Agent",
  "type": "admin",
  "channels": {
    "configs": {
      "cli": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    },
    "sessionGroups": [],
    "allowAgents": []
  },
  "sessionPolicy": "global",
  "model": "anthropic/claude-opus-4-5",
  "provider": "anthropic",
  "autoStart": true
}
```

#### 3.3.2 User Agent 配置

```json
{
  "id": "bro",
  "name": "Bro",
  "type": "user",
  "channels": {
    "configs": {
      "web": {
        "enabled": true,
        "allowFrom": ["user_web_001", "user_web_002"]
      },
      "feishu": {
        "enabled": true,
        "appId": "cli_a92e839d19389bd1",
        "appSecret": "aiQpnx4Qj4AmxXUclkzF1cy72n7CNu04",
        "allowFrom": ["ou_06e5d52a64878fe2185075e08a2d81d2"],
        "reactEmoji": "THUMBSUP"
      },
      "telegram": {
        "enabled": true,
        "token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        "allowFrom": ["123456789"]
      }
    },
    "sessionGroups": [
      {
        "groupId": "1",
        "chatIds": {
          "web": "user_web_001",
          "feishu": "ou_06e5d52a64878fe2185075e08a2d81d2"
        }
      },
      {
        "groupId": "2",
        "chatIds": {
          "web": "user_web_002",
          "telegram": "123456789"
        }
      }
    ],
    "allowAgents": ["code_reviewer", "data_analyst"]
  },
  "sessionPolicy": "per_user",
  "model": "anthropic/claude-sonnet-4-20250514",
  "provider": "anthropic",
  "autoStart": true,
  "token": "bro_token_xxx"
}
```

#### 3.3.3 Specialized Agent 配置

```json
{
  "id": "code_reviewer",
  "name": "Code Reviewer",
  "type": "specialized",
  "channels": {
    "configs": {
      "cli": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    },
    "sessionGroups": [],
    "allowAgents": ["bro", "alice"]
  },
  "sessionPolicy": "per_agent",
  "model": "anthropic/claude-opus-4-5",
  "provider": "anthropic",
  "autoStart": true
}
```

---

## 4. 目录结构

### 4.1 整体结构

```
~/.nanocats/
├── config.json                 # 全局配置
├── agents/                     # Agent 配置目录
│   ├── admin.json
│   ├── bro.json
│   ├── alice.json
│   ├── code_reviewer.json
│   └── data_analyst.json
│
├── templates/                  # 全局模板（只读）
│   ├── AGENTS.md
│   ├── TOOLS.md
│   ├── HEARTBEAT.md
│   ├── SOUL.md
│   ├── USER.md
│   ├── BOOTSTRAP.md
│   └── skills/
│
└── workspaces/                # Agent 工作空间
    ├── admin/                 # Admin Agent
    │   ├── memory/
    │   │   ├── MEMORY.md
    │   │   └── history/
    │   ├── skills/
    │   └── sessions/
    │       └── global.jsonl
    │
    ├── bro/                   # User Agent
    │   ├── memory/
    │   ├── skills/
    │   └── sessions/
    │       ├── user_1.jsonl   # groupId=1
    │       └── user_2.jsonl   # groupId=2
    │
    ├── code_reviewer/         # Specialized Agent
    │   ├── memory/
    │   ├── skills/
    │   └── sessions/
    │       └── agent_bro.jsonl
    │
    └── ...                    # 更多 Agent
```

### 4.2 Session 文件命名

| Agent 类型 | Session Key | 文件名 |
|-----------|-------------|--------|
| Admin | `global` | `global.jsonl` |
| User | `user:1` | `user_1.jsonl` |
| User | `user:2` | `user_2.jsonl` |
| Specialized | `agent:bro` | `agent_bro.jsonl` |
| Specialized | `agent:alice` | `agent_alice.jsonl` |
| Task | `task:abc123` | `task_abc123.jsonl` |

---

## 5. 核心组件设计

### 5.1 新增文件结构

```
nanocats/
├── agent/
│   ├── config.py           # [NEW] Agent 配置加载
│   ├── registry.py         # [NEW] Agent 注册表
│   ├── types.py            # [NEW] Agent 类型定义
│   ├── loop.py             # [MOD] 接收 agent_id
│   └── ...
├── swarm/
│   ├── __init__.py
│   ├── manager.py          # [NEW] Swarm 管理器
│   └── router.py           # [NEW] 消息路由器
├── session/
│   ├── manager.py          # [MOD] 改造 session key 逻辑
│   └── ...
├── channels/
│   ├── base.py             # [MOD] 移除 session_key_override
│   ├── manager.py          # [MOD] Agent 感知
│   └── ...
├── bus/
│   ├── events.py           # [MOD] 扩展 InboundMessage
│   └── ...
└── ...
```

### 5.2 Agent 类型定义

```python
# nanocats/agent/types.py
from enum import Enum
from dataclasses import dataclass
from pathlib import Path
from typing import Any

class AgentType(Enum):
    ADMIN = "admin"
    USER = "user"
    SPECIALIZED = "specialized"
    TASK = "task"

@dataclass
class ChannelConfig:
    enabled: bool
    allow_from: list[str]
    # 其他 Channel 特定配置...

@dataclass
class SessionGroup:
    group_id: str
    chat_ids: dict[str, str]  # channel -> chat_id

@dataclass
class AgentChannelsConfig:
    configs: dict[str, ChannelConfig]
    session_groups: list[SessionGroup]
    allow_agents: list[str]

@dataclass
class AgentConfig:
    id: str
    name: str
    type: AgentType
    channels: AgentChannelsConfig
    session_policy: str
    model: str
    provider: str
    ttl: int | None
    auto_start: bool
    bound_user_key: str | None
    token: str | None
    routing: dict[str, Any]
    
    @property
    def workspace(self) -> Path:
        return Path.home() / ".nanocats" / "workspaces" / self.id
```

### 5.3 Agent 配置加载

```python
# nanocats/agent/config.py
import json
from pathlib import Path
from nanocats.agent.types import AgentConfig, AgentType, ChannelConfig, SessionGroup, AgentChannelsConfig
from nanocats.config.loader import load_config

class AgentConfigLoader:
    """Agent 配置加载器"""
    
    AGENTS_DIR = Path.home() / ".nanocats" / "agents"
    
    @classmethod
    def load(cls, agent_id: str) -> AgentConfig | None:
        """加载单个 Agent 配置"""
        config_path = cls.AGENTS_DIR / f"{agent_id}.json"
        if not config_path.exists():
            return None
        
        with open(config_path) as f:
            data = json.load(f)
        
        return cls._parse(agent_id, data)
    
    @classmethod
    def load_all(cls) -> dict[str, AgentConfig]:
        """加载所有 Agent 配置"""
        agents = {}
        for path in cls.AGENTS_DIR.glob("*.json"):
            agent_id = path.stem
            if config := cls.load(agent_id):
                agents[agent_id] = config
        return agents
    
    @classmethod
    def _parse(cls, agent_id: str, data: dict) -> AgentConfig:
        """解析配置"""
        # 解析 channels
        channels_data = data.get("channels", {})
        configs = {}
        for channel_name, channel_data in channels_data.get("configs", {}).items():
            configs[channel_name] = ChannelConfig(
                enabled=channel_data.get("enabled", False),
                allow_from=channel_data.get("allowFrom", []),
                **{k: v for k, v in channel_data.items() if k not in ["enabled", "allowFrom"]}
            )
        
        session_groups = [
            SessionGroup(
                group_id=sg["groupId"],
                chat_ids=sg["chatIds"]
            )
            for sg in channels_data.get("sessionGroups", [])
        ]
        
        channels = AgentChannelsConfig(
            configs=configs,
            session_groups=session_groups,
            allow_agents=channels_data.get("allowAgents", [])
        )
        
        return AgentConfig(
            id=agent_id,
            name=data.get("name", agent_id),
            type=AgentType(data.get("type", "user")),
            channels=channels,
            session_policy=data.get("sessionPolicy", "per_user"),
            model=data.get("model", "anthropic/claude-opus-4-5"),
            provider=data.get("provider", "anthropic"),
            ttl=data.get("ttl"),
            auto_start=data.get("autoStart", True),
            bound_user_key=data.get("boundUserKey"),
            token=data.get("token"),
            routing=data.get("routing", {})
        )
```

### 5.4 Agent 注册表

```python
# nanocats/agent/registry.py
from nanocats.agent.config import AgentConfigLoader
from nanocats.agent.types import AgentConfig, AgentType
from loguru import logger

class AgentRegistry:
    """Agent 注册表 - 管理所有 Agent 配置"""
    
    def __init__(self):
        self._agents: dict[str, AgentConfig] = {}
        self._load()
    
    def _load(self):
        """加载所有 Agent 配置"""
        self._agents = AgentConfigLoader.load_all()
        logger.info("Loaded {} agents", len(self._agents))
    
    def reload(self):
        """重新加载配置"""
        self._load()
    
    def get(self, agent_id: str) -> AgentConfig | None:
        """获取 Agent 配置"""
        return self._agents.get(agent_id)
    
    def get_by_channel(self, channel: str, chat_id: str) -> tuple[AgentConfig, str] | None:
        """
        根据 Channel 和 ChatId 查找 Agent 和 Session Group ID
        
        Returns:
            (AgentConfig, group_id) 或 None
        """
        for agent in self._agents.values():
            channel_cfg = agent.channels.configs.get(channel)
            if not channel_cfg or not channel_cfg.enabled:
                continue
            
            # 检查 allowFrom
            if "*" not in channel_cfg.allow_from and chat_id not in channel_cfg.allow_from:
                continue
            
            # 查找 session group
            for sg in agent.channels.session_groups:
                if channel in sg.chat_ids and sg.chat_ids[channel] == chat_id:
                    return agent, sg.group_id
            
            # 如果是 Admin 或 Specialized，允许创建新 session
            if agent.type in (AgentType.ADMIN, AgentType.SPECIALIZED):
                return agent, None
        
        return None
    
    def get_all(self) -> dict[str, AgentConfig]:
        """获取所有 Agent"""
        return self._agents.copy()
    
    def get_auto_start_agents(self) -> list[AgentConfig]:
        """获取需要自动启动的 Agent"""
        return [a for a in self._agents.values() if a.auto_start]
```

---

## 6. Session 管理改造

### 6.1 新的 Session Key 生成逻辑

```python
# nanocats/session/manager.py (改造)
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from nanocats.agent.types import AgentConfig, AgentType

class SessionManager:
    """Session 管理器 - 支持 Agent 类型的 Session Key"""
    
    def __init__(self, workspace: Path, agent_config: "AgentConfig | None" = None):
        self.workspace = workspace
        self.agent_config = agent_config
        self.sessions_dir = ensure_dir(workspace / "sessions")
    
    @staticmethod
    def generate_session_key(
        agent_type: "AgentType",
        group_id: str | None = None,
        caller_agent_id: str | None = None,
        task_id: str | None = None,
    ) -> str:
        """
        根据 Agent 类型生成 Session Key
        
        Args:
            agent_type: Agent 类型
            group_id: Session Group ID (User Agent)
            caller_agent_id: 调用者 Agent ID (Specialized Agent)
            task_id: 任务 ID (Task Agent)
        
        Returns:
            Session Key 字符串
        """
        if agent_type == AgentType.ADMIN:
            return "global"
        
        elif agent_type == AgentType.USER:
            if not group_id:
                raise ValueError("User Agent requires group_id")
            return f"user:{group_id}"
        
        elif agent_type == AgentType.SPECIALIZED:
            if not caller_agent_id:
                raise ValueError("Specialized Agent requires caller_agent_id")
            return f"agent:{caller_agent_id}"
        
        elif agent_type == AgentType.TASK:
            if not task_id:
                raise ValueError("Task Agent requires task_id")
            return f"task:{task_id}"
        
        raise ValueError(f"Unknown agent type: {agent_type}")
    
    @staticmethod
    def parse_session_key(key: str) -> dict:
        """
        解析 Session Key
        
        Returns:
            dict with agent_type, group_id, agent_id, task_id
        """
        parts = key.split(":")
        
        if parts[0] == "global":
            return {"agent_type": "admin", "group_id": None, "agent_id": None, "task_id": None}
        
        elif parts[0] == "user":
            return {"agent_type": "user", "group_id": parts[1] if len(parts) > 1 else None, "agent_id": None, "task_id": None}
        
        elif parts[0] == "agent":
            return {"agent_type": "specialized", "group_id": None, "agent_id": parts[1] if len(parts) > 1 else None, "task_id": None}
        
        elif parts[0] == "task":
            return {"agent_type": "task", "group_id": None, "agent_id": None, "task_id": parts[1] if len(parts) > 1 else None}
        
        raise ValueError(f"Invalid session key: {key}")
    
    def _get_session_path(self, key: str) -> Path:
        """获取 Session 文件路径"""
        # 转换 key 为安全的文件名
        safe_key = key.replace(":", "_")
        return self.sessions_dir / f"{safe_key}.jsonl"
```

### 6.2 Session Group 解析

```python
# nanocats/session/resolver.py (NEW)
from nanocats.agent.types import AgentConfig, SessionGroup
from nanocats.agent.registry import AgentRegistry

class SessionResolver:
    """Session 解析器 - 解析 Channel+ChatId 到 Session Key"""
    
    def __init__(self, registry: AgentRegistry):
        self.registry = registry
    
    def resolve(
        self,
        channel: str,
        chat_id: str,
    ) -> tuple[str, AgentConfig, str] | None:
        """
        解析 Channel+ChatId 到 Session Key
        
        Args:
            channel: 渠道类型 (telegram, feishu, web...)
            chat_id: 渠道下的子分类 ID
        
        Returns:
            (session_key, agent_config, session_group_id) 或 None
        """
        result = self.registry.get_by_channel(channel, chat_id)
        if not result:
            return None
        
        agent, group_id = result
        
        # 生成 session key
        from nanocats.session.manager import SessionManager
        session_key = SessionManager.generate_session_key(
            agent_type=agent.type,
            group_id=group_id,
            caller_agent_id=None,  # TODO: 从消息上下文获取
            task_id=None,          # TODO: 从消息上下文获取
        )
        
        return session_key, agent, group_id
    
    def build_session_context(
        self,
        agent: AgentConfig,
        group_id: str | None,
    ) -> dict:
        """
        构建 Session 上下文
        
        Returns:
            dict 包含 workspace, session_key 等
        """
        from nanocats.session.manager import SessionManager
        
        session_key = SessionManager.generate_session_key(
            agent_type=agent.type,
            group_id=group_id,
        )
        
        return {
            "agent_id": agent.id,
            "agent_type": agent.type.value,
            "agent_name": agent.name,
            "workspace": agent.workspace,
            "session_key": session_key,
            "session_policy": agent.session_policy,
            "allow_agents": agent.channels.allow_agents,
        }
```

---

## 7. 消息流转改造

### 7.1 InboundMessage 扩展

```python
# nanocats/bus/events.py (改造)
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

@dataclass
class InboundMessage:
    """改造后的入站消息"""
    
    channel: str           # telegram, discord, feishu...
    sender_id: str         # 用户在平台上的 ID
    chat_id: str           # Channel 下的子分类
    
    # 新增字段
    agent_id: str | None = None       # 目标 Agent ID
    agent_type: str | None = None      # 目标 Agent 类型
    session_key: str | None = None     # 计算后的 Session Key
    session_group_id: str | None = None  # Session Group ID
    
    # 保留字段
    content: str = ""
    media: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    
    @classmethod
    def from_channel_message(
        cls,
        channel: str,
        sender_id: str,
        chat_id: str,
        content: str,
        media: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> "InboundMessage":
        """从 Channel 消息创建"""
        return cls(
            channel=channel,
            sender_id=sender_id,
            chat_id=chat_id,
            content=content,
            media=media or [],
            metadata=metadata or {},
        )
```

### 7.2 Channel 改造

```python
# nanocats/channels/base.py (改造)
class BaseChannel(ABC):
    """Channel 基类 - 改造为支持 Agent 路由"""
    
    name: str = "base"
    
    def __init__(self, config: Any, bus: MessageBus, agent_registry: AgentRegistry | None = None):
        self.config = config
        self.bus = bus
        self.agent_registry = agent_registry  # 新增
        self._running = False
    
    async def _handle_message(
        self,
        sender_id: str,
        chat_id: str,
        content: str,
        media: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """处理入站消息"""
        # 权限校验
        if not self.is_allowed(sender_id):
            return
        
        # 解析 Agent 和 Session
        msg = InboundMessage.from_channel_message(
            channel=self.name,
            sender_id=sender_id,
            chat_id=chat_id,
            content=content,
            media=media,
            metadata=metadata,
        )
        
        # 如果有 AgentRegistry，进行路由解析
        if self.agent_registry:
            from nanocats.session.resolver import SessionResolver
            resolver = SessionResolver(self.agent_registry)
            result = resolver.resolve(chat_id, chat_id)  # TODO: 需要传入正确参数
            
            if result:
                session_key, agent, group_id = result
                msg.agent_id = agent.id
                msg.agent_type = agent.type.value
                msg.session_key = session_key
                msg.session_group_id = group_id
        
        await self.bus.publish_inbound(msg)
```

### 7.3 AgentLoop 改造

```python
# nanocats/agent/loop.py (改造)
class AgentLoop:
    """Agent 循环 - 改造为支持多 Agent"""
    
    def __init__(
        self,
        bus: MessageBus,
        agent_config: AgentConfig,  # 改为 AgentConfig
        # ... 其他参数
    ):
        self.bus = bus
        self.agent_config = agent_config  # 持有 Agent 配置
        self.workspace = agent_config.workspace  # 使用 Agent 独立工作空间
        self.sessions = SessionManager(self.workspace, agent_config)
        # ...
    
    async def _process_message(self, msg: InboundMessage) -> OutboundMessage | None:
        """处理消息 - 改造为支持 Session Group"""
        
        # 使用消息中的 session_key，或从 Agent 配置生成
        if msg.session_key:
            session_key = msg.session_key
        else:
            # 从 Agent 配置生成
            session_key = SessionManager.generate_session_key(
                agent_type=self.agent_config.type,
                group_id=msg.session_group_id,
            )
        
        # 获取或创建 Session
        session = self.sessions.get_or_create(session_key)
        
        # ... 后续处理
```

---

## 8. Swarm 管理器

### 8.1 SwarmManager 设计

```python
# nanocats/swarm/manager.py (NEW)
import asyncio
from nanocats.agent.registry import AgentRegistry
from nanocats.agent.loop import AgentLoop
from nanocats.agent.config import AgentConfigLoader
from nanocats.bus.queue import MessageBus
from nanocats.providers.base import LLMProvider
from loguru import logger

class SwarmManager:
    """Swarm 管理器 - 管理所有 Agent 实例"""
    
    def __init__(
        self,
        bus: MessageBus,
        provider: LLMProvider,
    ):
        self.bus = bus
        self.provider = provider
        self.registry = AgentRegistry()
        self.agents: dict[str, AgentLoop] = {}
        self._running = False
    
    async def start(self):
        """启动所有自动启动的 Agent"""
        self._running = True
        
        for agent_config in self.registry.get_auto_start_agents():
            await self._start_agent(agent_config)
        
        # 保持运行
        while self._running:
            await asyncio.sleep(1)
    
    async def _start_agent(self, config: AgentConfig):
        """启动单个 Agent"""
        logger.info("Starting agent: {} ({})", config.id, config.type.value)
        
        agent = AgentLoop(
            bus=self.bus,
            agent_config=config,
            provider=self.provider,
            model=config.model,
            # ... 其他参数
        )
        
        self.agents[config.id] = agent
        asyncio.create_task(agent.run())
    
    async def stop(self):
        """停止所有 Agent"""
        self._running = False
        for agent in self.agents.values():
            agent.stop()
        self.agents.clear()
    
    def get_agent(self, agent_id: str) -> AgentLoop | None:
        """获取 Agent 实例"""
        return self.agents.get(agent_id)
    
    async def spawn_task_agent(
        self,
        caller_agent_id: str,
        task_id: str,
        task: str,
    ) -> str:
        """派生 Task Agent"""
        # 创建临时 Task Agent 配置
        task_config = AgentConfig(
            id=f"task_{task_id}",
            name=f"Task {task_id}",
            type=AgentType.TASK,
            channels=AgentChannelsConfig(
                configs={},
                session_groups=[],
                allow_agents=[],
            ),
            session_policy="per_task",
            model="anthropic/claude-opus-4-5",
            provider="anthropic",
            ttl=3600,
            auto_start=False,
            bound_user_key=None,
            token=None,
            routing={},
        )
        
        await self._start_agent(task_config)
        return f"Task agent {task_id} started"
```

### 8.2 消息路由器

```python
# nanocats/swarm/router.py (NEW)
from nanocats.bus.events import InboundMessage
from nanocats.agent.registry import AgentRegistry
from nanocats.session.resolver import SessionResolver

class MessageRouter:
    """消息路由器 - 将消息路由到正确的 Agent"""
    
    def __init__(self, registry: AgentRegistry, swarm_manager):
        self.registry = registry
        self.swarm_manager = swarm_manager
        self.resolver = SessionResolver(registry)
    
    async def route(self, msg: InboundMessage) -> AgentLoop | None:
        """
        路由消息到正确的 Agent
        
        Args:
            msg: 入站消息
        
        Returns:
            AgentLoop 实例或 None
        """
        # 1. 如果消息已指定 agent_id，直接返回
        if msg.agent_id:
            return self.swarm_manager.get_agent(msg.agent_id)
        
        # 2. 通过 Channel + ChatId 查找
        result = self.resolver.resolve(msg.channel, msg.chat_id)
        if result:
            session_key, agent_config, group_id = result
            msg.agent_id = agent_config.id
            msg.agent_type = agent_config.type.value
            msg.session_key = session_key
            msg.session_group_id = group_id
            
            return self.swarm_manager.get_agent(agent_config.id)
        
        # 3. 查找默认 Agent (admin)
        admin_agent = self.registry.get("admin")
        if admin_agent:
            return self.swarm_manager.get_agent("admin")
        
        logger.warning("No agent found for message: {}:{}", msg.channel, msg.chat_id)
        return None
    
    def can_communicate(self, from_agent_id: str, to_agent_id: str) -> bool:
        """检查两个 Agent 之间是否可以通信"""
        from_agent = self.registry.get(from_agent_id)
        to_agent = self.registry.get(to_agent_id)
        
        if not from_agent or not to_agent:
            return False
        
        # Specialized Agent 检查 allowAgents
        if from_agent.type == AgentType.SPECIALIZED:
            return to_agent_id in from_agent.channels.allow_agents
        
        # User Agent 检查 allowAgents
        if from_agent.type == AgentType.USER:
            return to_agent_id in from_agent.channels.allow_agents
        
        return True
```

---

## 9. Gateway 启动改造

### 9.1 新的启动流程

```python
# nanocats/cli/commands.py (改造)
@cli.command()
def gateway(
    port: int | None = typer.Option(None, "--port", "-p"),
    workspace: str | None = typer.Option(None, "--workspace", "-w"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
    config: str | None = typer.Option(None, "--config", "-c"),
):
    """Start the nanocats swarm gateway."""
    
    from nanocats.bus.queue import MessageBus
    from nanocats.providers.factory import ProviderFactory
    from nanocats.swarm.manager import SwarmManager
    from nanocats.channels.manager import ChannelManager
    
    # 1. 初始化基础组件
    config = _load_runtime_config(config, workspace)
    bus = MessageBus()
    provider = ProviderFactory.create(config)
    
    # 2. 创建 Swarm Manager
    swarm = SwarmManager(bus=bus, provider=provider)
    
    # 3. 创建 Channel Manager (传入 AgentRegistry)
    channel_manager = ChannelManager(config, bus, agent_registry=swarm.registry)
    
    # 4. 启动
    async def run():
        await asyncio.gather(
            swarm.start(),
            channel_manager.start_all(),
        )
    
    asyncio.run(run())
```

---

## 10. 实现计划

### 10.1 Phase 1: 基础架构（预计 2 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| [ ] Agent 类型定义 | `agent/types.py` | AgentType, AgentConfig 等 |
| [ ] 配置加载器 | `agent/config.py` | AgentConfigLoader |
| [ ] Agent 注册表 | `agent/registry.py` | AgentRegistry |
| [ ] Session 改造 | `session/manager.py` | 新的 session_key 逻辑 |

### 10.2 Phase 2: 消息路由（预计 2 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| [ ] InboundMessage 扩展 | `bus/events.py` | 新增字段 |
| [ ] Session 解析器 | `session/resolver.py` | Channel→Session |
| [ ] Channel 改造 | `channels/base.py` | Agent 感知 |
| [ ] AgentLoop 改造 | `agent/loop.py` | 支持多 Agent |

### 10.3 Phase 3: Swarm 管理（预计 2 天）

| 任务 | 文件 | 说明 |
|------|------|------|
| [ ] SwarmManager | `swarm/manager.py` | Agent 生命周期 |
| [ ] MessageRouter | `swarm/router.py` | 消息路由 |
| [ ] Gateway 改造 | `cli/commands.py` | 启动流程 |
| [ ] ChannelManager 改造 | `channels/manager.py` | Agent 注入 |

### 10.4 Phase 4: 测试与优化（预计 1 天）

| 任务 | 说明 |
|------|------|
| [ ] 单元测试 | 各模块测试 |
| [ ] 集成测试 | 端到端测试 |
| [ ] 文档更新 | 使用文档 |

---

## 11. 向后兼容性

### 11.1 配置迁移

旧配置格式：
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "allowFrom": ["123456"]
    }
  }
}
```

新配置格式：
```json
{
  "id": "default",
  "name": "Default Agent",
  "type": "user",
  "channels": {
    "configs": {
      "telegram": {
        "enabled": true,
        "allowFrom": ["123456"]
      }
    },
    "sessionGroups": [
      {"groupId": "default", "chatIds": {"telegram": "123456"}}
    ],
    "allowAgents": []
  },
  "sessionPolicy": "per_user"
}
```

### 11.2 Session 文件迁移

旧文件：
```
sessions/telegram_123456.jsonl
```

新文件：
```
sessions/user_default.jsonl
```

---

## 12. 总结

本方案实现了：

1. **Agent 类型划分** - Admin / User / Specialized / Task 四种类型
2. **独立工作空间** - 每个 Agent 拥有独立的 `~/.nanocats/workspaces/{agent_id}/`
3. **灵活 Session 共享** - 通过 `sessionGroups` 配置实现跨 Channel 共享
4. **ChatId 验证** - 通过 `allowFrom` 白名单控制访问
5. **Agent 间通信** - 通过 `allowAgents` 控制 Agent 间对话

---

*文档版本：v1.0 - 2026-03-14*
