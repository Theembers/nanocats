# 飞书渠道配置边界修复方案

## 0. 背景知识

### 0.1 飞书 SDK 权限机制

**飞书 SDK 本身不提供业务层的"白名单"功能**，权限控制由飞书后台的配置决定：

| 层级 | 控制方式 | 说明 |
|------|----------|------|
| **应用权限** | API 权限 | 决定应用能调用哪些 API |
| **应用可用范围** | 发布版本配置 | 决定哪些用户/部门能使用应用 |
| **IP 白名单** | 安全设置 | 限制调用 API 的来源 IP |

### 0.2 sender_id vs chat_id

| ID 类型 | 说明 |
|---------|------|
| `open_id` | 用户在某个应用内的唯一标识（不同应用不同） |
| `user_id` | 用户在企业内的唯一标识 |
| `chat_id` | 会话 ID（单聊或群聊） |

- **单聊**：`sender_id == chat_id`（对方用户 ID）
- **群聊**：`sender_id` = 发送者，`chat_id` = 群 ID

### 0.3 nanocat 的 allow_from

`allow_from` 是 **nanocat 自己实现的安全控制**（非飞书 SDK 功能），用于：
- 控制哪些用户可以与机器人交互
- 类似于飞书后台的"应用可用范围"配置

---

## 1. 问题描述

当前代码存在配置边界模糊的问题：

### 1.1 问题 1：`_init_channels` 错误合并 Agent 配置

- 第 54-69 行：从 Agent 配置中读取 `allow_from` 并合并到渠道配置
- 混淆了"渠道连接参数"和"Agent 权限控制"

### 1.2 问题 2：`_validate_allow_from` 验证错误的配置

- 检查渠道级别的 `allow_from` 是否为空
- 但权限控制在 Agent 层，启动时验证无意义

### 1.3 问题 3：`is_allowed` 语义错误

- 使用渠道实例的 `allow_from` 检查 `sender_id`
- 实际权限检查应由 Agent 配置控制

## 2. 修复方案

### 2.1 配置边界划分

| 阶段 | 配置来源 | 用途 |
|------|----------|------|
| **初始化阶段** | 全局配置 `channels.{name}` | 创建渠道实例（连接凭证、行为参数） |
| **运行时** | Agent 配置 `agents/{id}.channels.configs.{name}` | 路由 + 权限控制（通过 find_by_channel） |

### 2.2 数据流

```
初始化阶段:
  ChannelManager._init_channels()
    └── 读取全局配置 channels.feishu

消息接收阶段:
  FeishuChannel._on_message()
    └── _handle_message()
        ├── is_allowed(sender_id) → 始终返回 True
        └── _resolve_agent_info()
            └── find_by_channel(chat_id) → 检查 Agent 配置的 allow_from
```

## 3. 修改清单

### 修改 1：删除 Agent 配置合并逻辑

**文件**: `nanocats/channels/manager.py`

删除第 54-69 行（Agent 配置合并相关代码）：

```python
# 删除以下代码：
if self.agent_registry:
    for agent_config in self.agent_registry.get_all().values():
        for ch_name, ch_config in agent_config.channels.configs.items():
            if ch_config.enabled:
                if ch_name not in enabled_channels:
                    enabled_channels[ch_name] = {}
                else:
                    base_cfg = enabled_channels[ch_name].copy()
                    enabled_channels[ch_name] = base_cfg
                if isinstance(ch_config.extra, dict):
                    enabled_channels[ch_name].update(ch_config.extra)
                if ch_config.allow_from:
                    enabled_channels[ch_name]["allow_from"] = ch_config.allow_from
                if "enabled" not in enabled_channels[ch_name]:
                    enabled_channels[ch_name]["enabled"] = True
                logger.debug("Channel {} enabled by agent {}", ch_name, agent_config.id)
```

修改后只从全局配置读取渠道启用状态。

### 修改 2：删除 `_validate_allow_from` 方法

**文件**: `nanocats/channels/manager.py`

删除第 92-98 行：

```python
# 删除以下方法：
def _validate_allow_from(self) -> None:
    for name, ch in self.channels.items():
        if getattr(ch.config, "allow_from", None) == []:
            raise SystemExit(
                f'Error: "{name}" has empty allowFrom (denies all). '
                f'Set ["*"] to allow everyone, or add specific user IDs.'
            )
```

**原因**：权限检查已在运行时通过 `AgentRegistry.find_by_channel()` 完成，启动时验证无意义。

### 修改 3：简化 `is_allowed` 方法

**文件**: `nanocats/channels/base.py`

**当前逻辑** (第 75-83 行):
```python
def is_allowed(self, sender_id: str) -> bool:
    """Check if *sender_id* is permitted.  Empty list → deny all; ``"*"`` → allow all."""
    allow_list = getattr(self.config, "allow_from", [])
    if not allow_list:
        logger.warning("{}: allow_from is empty — all access denied", self.name)
        return False
    if "*" in allow_list:
        return True
    return str(sender_id) in allow_list
```

**修改为**:
```python
def is_allowed(self, sender_id: str) -> bool:
    """
    渠道层不做权限检查。
    权限控制由 Agent 层的 find_by_channel() 完成。
    """
    return True
```

## 4. 不需要修改的部分

以下保持原有逻辑不变：

- `AgentRegistry.find_by_channel()` - 已有权限检查逻辑
- `AgentRegistry._is_chat_allowed()` - 检查 Agent 配置的 allow_from
- `BaseChannel._handle_message()` - 流程不变
- `BaseChannel._resolve_agent_info()` - 流程不变

## 5. 配置示例

### 全局配置 (config.json)

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "app_id": "cli_xxx",
      "app_secret": "xxx",
      "react_emoji": "Typing",
      "group_policy": "mention"
    }
  }
}
```

### Agent 配置 (agents/my_agent.json)

```json
{
  "id": "my_agent",
  "channels": {
    "configs": {
      "feishu": {
        "enabled": true,
        "allowFrom": ["ou_xxx", "oc_yyy"]
      }
    }
  }
}
```

## 6. 实现顺序

1. 修改 `ChannelManager._init_channels()` - 移除 Agent 配置合并
2. 删除 `ChannelManager._validate_allow_from()` 方法
3. 修改 `BaseChannel.is_allowed()` - 简化为始终返回 True
