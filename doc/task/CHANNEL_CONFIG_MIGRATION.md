# Agent 配置文件格式标准化 - 代码修改计划

> 文档版本: 1.0
> 日期: 2026-03-15
> 状态: 待执行

---

## 1. 路径约定

所有配置文件路径均为 `~/.nanocats/` (有 's')

| 用途 | 路径 |
|------|------|
| 主配置 | `~/.nanocats/config.json` |
| Agent 配置 | `~/.nanocats/agents/{id}.json` |
| 全局 workspace | `~/.nanocats/workspace/` |
| Agent workspace | `~/.nanocats/workspaces/{id}/` |

---

## 2. 需求背景

根据澄清结论：

1. **简化格式** (`channels.enabled: ["web"]`) 只应存在于主配置，用于 gateway 启动时决定启用哪些通道
2. **详细格式** (`channels.configs.web.enabled + allowFrom`) 用于 Agent 配置，管理 Agent 渠道权限
3. WebUI 页面只管理 Agent 的渠道配置

---

## 3. 现有问题

当前 Agent 配置文件使用简化格式，但代码路由逻辑需要详细格式：

```json
// 现有配置 (错误)
{
  "channels": {
    "enabled": ["web"]
  }
}

// 需要转换为
{
  "channels": {
    "configs": {
      "web": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    }
  }
}
```

---

## 4. 修改计划

### 4.1 现有 Agent 配置迁移 (P0)

#### 4.1.1 `~/.nanocats/agents/master.json`

```json
// 修改前
{
  "id": "master",
  "name": "Master Agent",
  "type": "admin",
  "sessionPolicy": "global",
  "model": "MiniMax-M2.5",
  "provider": "minimax",
  "autoStart": true,
  "channels": {
    "enabled": ["web"]
  }
}

// 修改后
{
  "id": "master",
  "name": "Master Agent",
  "type": "admin",
  "sessionPolicy": "global",
  "model": "MiniMax-M2.5",
  "provider": "minimax",
  "autoStart": true,
  "channels": {
    "configs": {
      "web": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    }
  }
}
```

#### 4.1.2 `~/.nanocats/agents/Bro.json`

```json
// 修改前
{
  "id": "Bro",
  "name": "Bro",
  "type": "user",
  "sessionPolicy": "per_user",
  "model": "MiniMax-M2.5",
  "provider": "minimax",
  "autoStart": true,
  "channels": {
    "enabled": ["web"]
  }
}

// 修改后
{
  "id": "Bro",
  "name": "Bro",
  "type": "user",
  "sessionPolicy": "per_user",
  "model": "MiniMax-M2.5",
  "provider": "minimax",
  "autoStart": true,
  "channels": {
    "configs": {
      "web": {
        "enabled": true,
        "allowFrom": ["*"]
      }
    }
  }
}
```

---

### 4.2 AgentConfigLoader 修改 (P1)

**文件**: `nanocats/agent/config.py`

**修改内容**: 删除对 `channels.enabled` 数组格式的处理，只保留 `channels.configs` 详细格式解析

```python
# 修改后的 _parse 方法
@classmethod
def _parse(cls, agent_id: str, data: dict) -> AgentConfig:
    channels_data = data.get("channels", {})
    
    # 只解析详细格式 configs
    configs = {}
    for name, ch_data in channels_data.get("configs", {}).items():
        standard_fields = {"enabled", "allowFrom"}
        extra = {k: v for k, v in ch_data.items() if k not in standard_fields}
        configs[name] = ChannelConfig(
            enabled=ch_data.get("enabled", False),
            allow_from=ch_data.get("allowFrom", []),
            extra=extra,
        )
    
    session_groups = [
        SessionGroup(group_id=sg["groupId"], chat_ids=sg["chatIds"])
        for sg in channels_data.get("sessionGroups", [])
    ]

    channels = AgentChannelsConfig(
        configs=configs,
        session_groups=session_groups,
        allow_agents=channels_data.get("allowAgents", []),
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
        routing=data.get("routing", {}),
    )
```

**关键变更**:
- 删除对 `channels_data.get("enabled", [])` 数组格式的处理
- 只保留 `channels_data.get("configs", {})` 详细格式解析

---

### 4.3 ChannelManager 修改 (P2)

**文件**: `nanocats/channels/manager.py`

**修改内容**: 明确配置来源分离逻辑

```python
# 修改后的 _init_channels 方法
def _init_channels(self) -> None:
    from nanocats.channels.registry import discover_all
    
    all_channels = discover_all()
    enabled_channels: dict[str, dict] = {}
    
    # 1. 从主配置获取启用的通道 (简化格式)
    # 位置: ~/.nanocats/config.json
    for name, cls in all_channels.items():
        section = getattr(self.config.channels, name, None)
        if section is None:
            continue
        
        channel_config = section.model_dump() if hasattr(section, 'model_dump') else {}
        enabled = channel_config.get("enabled", False)
        
        if enabled:
            enabled_channels[name] = channel_config
    
    # 2. 从 Agent 配置补充 allow_from (详细格式)
    # 位置: ~/.nanocats/agents/{id}.json
    if self.agent_registry:
        for agent_config in self.agent_registry.get_all().values():
            for ch_name, ch_config in agent_config.channels.configs.items():
                if ch_config.enabled:
                    if ch_name not in enabled_channels:
                        enabled_channels[ch_name] = {"enabled": True}
                    if ch_config.allow_from:
                        enabled_channels[ch_name]["allow_from"] = ch_config.allow_from
                    if "enabled" not in enabled_channels[ch_name]:
                        enabled_channels[ch_name]["enabled"] = True
    
    # 3. 创建通道实例
    for name, channel_config in enabled_channels.items():
        cls = all_channels.get(name)
        if not cls:
            continue
        
        enabled = channel_config.get("enabled", False)
        if not enabled:
            continue
        
        try:
            channel = cls(channel_config, self.bus, self.agent_registry)
            self.channels[name] = channel
            logger.info("{} channel enabled", cls.display_name)
        except Exception as e:
            logger.warning("{} channel not available: {}", name, e)
    
    self._validate_allow_from()
```

**关键变更**:
- 明确区分主配置和 Agent 配置的职责
- 主配置决定通道是否启动 (`enabled`)
- Agent 配置决定权限 (`allow_from`)

---

## 5. 配置流程图

```
┌─────────────────────────────────────────────┐
│ nanocats gateway 启动                          │
└─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│ 读取主配置 (~/.nanocats/config.json)         │
│ channels.web.enabled = true                  │
└─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│ ChannelManager 初始化通道                      │
│                                             │
│ 1. 读取主配置的 enabled 字段                 │
│    → 确定启动哪些通道                         │
│                                             │
│ 2. 读取 Agent 配置的 allowFrom 字段         │
│    (~/.nanocats/agents/*/channels.configs) │
│    → 合并到通道配置中                        │
└─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│ 消息路由时                                    │
│ Registry.find_by_channel()                   │
│                                             │
│ - 检查 Agent channels.configs[channel]       │
│ - 验证 allowFrom 权限                       │
└─────────────────────────────────────────────┘
```

---

## 6. 修改优先级

| 优先级 | 任务 | 状态 |
|--------|------|------|
| P0 | 迁移现有 Agent 配置文件 | 待执行 |
| P1 | 修改 AgentConfigLoader | 待执行 |
| P2 | 修改 ChannelManager | 待执行 |

---

## 7. 文件修改汇总

| 文件 | 操作 | 说明 |
|------|------|------|
| `~/.nanocats/agents/master.json` | 手动修改 | 转换为详细格式 |
| `~/.nanocats/agents/Bro.json` | 手动修改 | 转换为详细格式 |
| `nanocats/agent/config.py` | 代码修改 | 删除简化格式解析 |
| `nanocats/channels/manager.py` | 代码修改 | 明确配置分离逻辑 |

---

## 8. 验证步骤

```bash
# 1. 验证配置文件格式
cat ~/.nanocats/agents/master.json | jq '.channels.configs'

# 2. 启动 gateway
nanocats gateway

# 3. 测试消息路由
# 通过 WebSocket 发送消息验证权限
ws://localhost:15751/ws
```

---

## 9. 回滚方案

如果修改后出现问题：

1. **回滚配置文件**: 恢复简化格式
2. **回滚代码**: 恢复 AgentConfigLoader 对简化格式的处理

---

*文档状态: 待执行*
