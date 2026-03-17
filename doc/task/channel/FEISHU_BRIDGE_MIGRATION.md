# 飞书通道改造方案：从 Python 迁移至 Node.js Bridge

## 背景

### 现状问题

当前 nanocats 项目的飞书通道存在以下问题：

1. **丢消息** — Python 实现使用 WebSocket 长连接，但在网络波动或重连场景下可能丢失消息
2. **不支持多 bot** — 现有实现为单 bot 设计，无法同时接入多个飞书应用

### 解决方案

复用 OpenClaw 社区成熟的飞书插件实现，将其作为 Node.js Bridge 接入 nanocats Python 核心。

OpenClaw 飞书插件的核心优势：
- **消息去重** — 本地存储 message_id，防止重复处理
- **多账号支持** — 通过 `accounts` 配置可同时接入多个飞书应用
- **官方维护** — `@larksuite/openclaw-lark` 由飞书官方团队维护

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        nanocats                                 │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐    │
│  │   Agent     │    │   Tools     │    │     Memory      │    │
│  │  (Python)   │    │  (Python)   │    │    (Python)    │    │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘    │
│         │                   │                     │             │
│         └───────────────────┼─────────────────────┘             │
│                             │                                 │
│                      MessageBus (Python)                      │
│                             │                                 │
└─────────────────────────────┼─────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  WhatsApp Bridge│  │   Feishu Bridge │  │   Other Bridge  │
│   (Node.js)     │  │   (Node.js)     │  │   (Node.js)    │
│   ws://localhost│  │   ws://localhost│  │   ws://localhost│
│       :3001     │  │       :3002     │  │       :3003     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│   WhatsApp      │  │     Feishi      │
│   (Baileys)     │  │   (WebSocket)   │
└─────────────────┘  └─────────────────┘
```

### 通信协议

Bridge 与 Python 核心之间使用 WebSocket 通信（与现有 WhatsApp Bridge 一致）：

| 方向 | 消息类型 | 说明 |
|------|----------|------|
| Bridge → Python | `message` | 收到用户消息 |
| Bridge → Python | `status` | 连接状态变更 |
| Bridge → Python | `error` | 错误通知 |
| Python → Bridge | `send` | 发送消息给用户 |
| Python → Bridge | `auth` | 认证握手 |

### 消息格式

**Inbound Message (Bridge → Python)**

```typescript
interface InboundMessage {
  type: 'message';
  channel: 'feishu';           // 固定为 feishu
  instance_id: string;         // channel 实例名，如 "feishu-sales"
  sender_id: string;           // 发送者 open_id
  chat_id: string;             // 会话 ID（私聊为 open_id，群聊为 chat_id）
  chat_type: 'dm' | 'group';   // 会话类型
  content: string;             // 消息文本内容
  message_id: string;          // 飞书消息 ID（用于回复、反应等）
  media?: string[];            // 媒体文件路径（图片、文件等）
}
```

**Outbound Message (Python → Bridge)**

```typescript
interface SendCommand {
  type: 'send';
  to: string;        // 接收者 ID
  content: string;  // 消息内容（支持 Markdown）
  reply_to?: string; // 回复的消息 ID
  media?: string[]; // 媒体文件路径
}
```

---

## 配置设计

### 配置统一结构

与其他通道保持一致，通过 `type` 字段区分实现：

```json
{
  "channels": {
    "whatsapp-personal": {
      "type": "whatsapp",
      "enabled": true
    },
    "telegram-support": {
      "type": "telegram", 
      "enabled": true,
      "bot_token": "xxx"
    },
    "feishu-sales": {
      "type": "feishu_bridge",
      "enabled": true,
      "accounts": {
        "cli_xxx": { "app_secret": "xxx" }
      },
      "agent_id": "sales-agent"
    }
  }
}
```

### 飞书 Bridge 配置详解

```json
{
  "channels": {
    "feishu-sales": {
      "type": "feishu_bridge",
      "enabled": true,
      "accounts": {
        "cli_xxx": { "app_secret": "xxx" }
      },
      "agent_id": "sales-agent"
    },
    "feishu-support": {
      "type": "feishu_bridge",
      "enabled": true,
      "accounts": {
        "cli_yyy": { "app_secret": "yyy" }
      },
      "agent_id": "support-agent"
    }
  }
}
```

**配置说明：**

| 字段 | 说明 |
|------|------|
| `type` | 固定为 `feishu_bridge`，使用 Node.js Bridge 实现 |
| `enabled` | 是否启用 |
| `accounts` | 飞书应用凭证，支持多个（格式：`app_id`: `{app_secret}`） |
| `agent_id` | 绑定的 Agent ID（可选，用于消息路由） |

### 兼容现有配置

| type 值 | 使用的实现 |
|---------|-----------|
| `feishu` | 原有 Python 实现 (`feishu.py`) |
| `feishu_bridge` | 新 Node.js Bridge 实现 (`feishu_bridge.py`) |

用户按需选择，不废弃任何现有功能。

---

## 改造计划

### Phase 1: 创建 Feishu Bridge (Node.js)

#### 1.1 新建 `bridge/src/feishu/`

```
bridge/src/feishu/
├── index.ts            # 入口，导出 FeishuBridge 类
├── client.ts          # 飞书 WebSocket 客户端
├── message.ts         # 消息解析与构建
├── deduplication.ts   # 消息去重（基于 message_id）
└── types.ts           # 类型定义
```

#### 1.2 核心功能实现

| 功能 | 实现方式 |
|------|----------|
| WebSocket 长连接 | 使用 `@larksuite/oapi-sdk-nodejs` 的 WebSocket 客户端 |
| 消息去重 | 使用 `better-sqlite3` 存储 message_id，24h 自动清理 |
| 多账号支持 | 每个账号独立连接 |

#### 1.3 消息处理流程

```
收到飞书消息
    │
    ▼
┌─────────────────────┐
│  检查 message_id    │ ──→ 已存在 → 丢弃（去重）
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  存储 message_id   │  ← 24h 过期，自动清理
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  发送到 Python Core │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  标记已处理完成    │
└─────────────────────┘
```

### Phase 2: 新建 feishu-server.ts

#### 2.1 文件结构

```typescript
// bridge/src/feishu-server.ts
#!/usr/bin/env node
/**
 * nanocats Feishu Bridge
 * 
 * 连接飞书 WebSocket 到 nanocats Python 后端
 * 
 * Usage:
 *   FEISHU_BRIDGE_PORT=3002 node dist/feishu-server.js
 * 
 * 配置（通过环境变量或配置文件）:
 *   FEISHU_ACCOUNTS: JSON 格式的账号配置
 */

import { BridgeServer } from './server.js';
import { FeishuClient } from './feishu/index.js';

const PORT = parseInt(process.env.FEISHU_BRIDGE_PORT || '3002', 10);
const ACCOUNTS = JSON.parse(process.env.FEISHU_ACCOUNTS || '{}');
const TOKEN = process.env.BRIDGE_TOKEN || undefined;

console.log('🐈 nanocats Feishu Bridge');
console.log('==========================\n');

const server = new FeishuBridgeServer(PORT, ACCOUNTS, TOKEN);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down...');
  await server.stop();
  process.exit(0);
});

server.start().catch((error) => {
  console.error('Failed to start bridge:', error);
  process.exit(1);
});
```

#### 2.2 进程隔离

| 通道 | 入口文件 | 默认端口 |
|------|----------|----------|
| WhatsApp | `index.ts` | 3001 |
| Feishu | `feishu-server.ts` | 3002 |

每个通道独立进程、独立端口，互不影响。

### Phase 3: 创建 Python 代理通道

#### 3.1 新建 `nanocats/channels/feishu_bridge.py`

```python
class FeishuBridgeConfig(ChannelInstanceConfig):
    type: str = "feishu_bridge"
    enabled: bool = False
    instance_id: str = ""
    
    # Bridge 连接配置
    bridge_host: str = "127.0.0.1"
    bridge_port: int = 3002
    bridge_token: str = ""
    
    # 飞书账号配置
    accounts: dict[str, dict] = Field(default_factory=dict)
    # {
    #   "cli_xxx": {"app_secret": "xxx"},
    # }
    
    # 绑定的 Agent ID（可选）
    agent_id: str = ""
```

#### 3.2 核心方法

```python
class FeishuBridgeChannel(BaseChannel):
    """飞书通道代理 - 将消息转发到 Node.js Bridge"""
    
    name = "feishu"
    display_name = "Feishu (Bridge)"
    
    async def start(self) -> None:
        # 建立到 Bridge 的 WebSocket 连接
        # 监听消息事件
        
    async def stop(self) -> None:
        # 关闭 WebSocket 连接
        
    async def send(self, msg: OutboundMessage) -> None:
        # 发送消息到 Bridge
```

### Phase 4: 注册通道类型

#### 4.1 修改 `nanocats/channels/registry.py`

```python
def discover_all() -> dict[str, type[BaseChannel]]:
    return {
        "whatsapp": WhatsAppChannel,
        "telegram": TelegramChannel,
        "discord": DiscordChannel,
        "slack": SlackChannel,
        "feishu": FeishuChannel,              # 原有 Python 实现
        "feishu_bridge": FeishuBridgeChannel, # 新 Bridge 实现
    }
```

---

## 文件变更清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `bridge/src/feishu/index.ts` | 飞书 Bridge 入口 |
| `bridge/src/feishu/client.ts` | 飞书 WebSocket 客户端 |
| `bridge/src/feishu/message.ts` | 消息解析与构建 |
| `bridge/src/feishu/deduplication.ts` | 消息去重 |
| `bridge/src/feishu/types.ts` | 类型定义 |
| `bridge/src/feishu-server.ts` | 飞书 Bridge 服务入口 |
| `nanocats/channels/feishu_bridge.py` | Python 代理通道 |

### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `bridge/package.json` | 添加飞书 SDK 依赖 |
| `nanocats/channels/registry.py` | 注册 `feishu_bridge` 通道类型 |

### 无需修改

| 文件路径 | 说明 |
|----------|------|
| 其他通道配置文件 | 配置结构保持一致 |
| `nanocats/channels/feishu.py` | 保留，作为 `feishu` 类型使用 |

---

## 依赖清单

### Node.js 端

```json
{
  "@larksuite/oapi-sdk-nodejs": "^2.0.0",
  "better-sqlite3": "^11.0.0"
}
```

### Python 端

无需新增依赖，复用现有 `websockets`。

---

## 启动方式

### 方式 1: 分别启动

```bash
# 启动 WhatsApp Bridge
cd bridge
npm run build
node dist/index.js

# 启动飞书 Bridge（新终端）
FEISHU_BRIDGE_PORT=3002 FEISHU_ACCOUNTS='{"cli_xxx":{"app_secret":"xxx"}}' node dist/feishu-server.js

# 启动 nanocat gateway
nanocats gateway
```

### 方式 2: 使用配置文件

```bash
# 在配置文件中指定账号信息
# 启动时自动启动对应的 Bridge 进程
nanocats gateway
```

---

## 风险与注意事项

### 1. 飞书 API 配额

每个飞书应用有月度 API 配额限制（免费版 50,000 次/月）：
- 健康检查会消耗配额（约 27,000 次/月/机器）
- 消息收发不占用此配额（通过 WebSocket）

**建议**：在不需要的机器上禁用飞书通道，避免配额耗尽。

### 2. 多账号消息路由

通过 `agent_id` 字段指定绑定的 Agent：

```json
{
  "channels": {
    "feishu-sales": {
      "type": "feishu_bridge",
      "accounts": {"cli_xxx": {"app_secret": "xxx"}},
      "agent_id": "sales-agent"
    }
  }
}
```

### 3. 向后兼容

| type | 实现 | 用途 |
|------|------|------|
| `feishu` | feishu.py | 现有用户继续使用 |
| `feishu_bridge` | feishu_bridge.py | 新用户或需要多 bot 的用户 |

---

## 实施顺序

1. **Phase 1** — 实现 Node.js Feishu Bridge，测试基本消息收发
2. **Phase 2** — 新建 feishu-server.ts
3. **Phase 3** — 实现 Python 代理通道
4. **Phase 4** — 配置与端到端测试

---

## 参考资源

- [OpenClaw 飞书官方插件](https://github.com/larksuite/openclaw-lark)
- [飞书开放平台文档](https://open.feishu.cn/document/)
- [OpenClaw 飞书配置指南](https://github.com/AlexAnys/openclaw-feishu)
