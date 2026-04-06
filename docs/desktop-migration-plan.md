# NanoCats Manager - 桌面应用迁移方案

## 项目概览

| 项目 | 内容 |
|------|------|
| 项目名称 | nanocats-manager |
| 当前架构 | Next.js 16 Web Dashboard (App Router) |
| 迁移目标 | Tauri 跨平台桌面应用 (macOS + Windows + Linux) |
| nanobot 集成 | 外部 CLI 模式 (保持现状) |

---

## 一、技术方案选型

### 1.1 框架对比

| 维度 | Tauri (✅推荐) | Electron | Expo |
|------|----------------|----------|------|
| 打包体积 | **< 600KB** (OS webview) | ~150MB+ (Chromium) | N/A |
| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Next.js 适配 | 官方支持静态导出 | 直接嵌入 | 不适合 |
| macOS 支持 | ✅ 完善 | ✅ 完善 | ⚠️ 实验性 |
| Windows 支持 | ✅ 完善 | ✅ 完善 | ❌ |
| Linux 支持 | ✅ 完善 | ✅ 完善 | ❌ |
| 架构 | Rust 后端 + Web 前端 | Chromium + Node | React Native |

### 1.2 选择理由

- **Tauri**: 原生 WebView + Rust 后端，体积最小、性能最优，一套代码支持三平台
- **外部 CLI**: nanobot 作为外部进程管理，保持当前设计，无需内置
- **Next.js 静态导出**: Tauri 官方推荐方案，前端改动最小

---

## 二、目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri Desktop App                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Next.js UI    │    │       Rust Backend              │ │
│  │  (Static Export)│◄──►│  ┌─────────────────────────┐   │ │
│  │                 │    │  │  commands/ (Tauri IPC)   │   │ │
│  │  - React 19     │    │  │    - agents.rs          │   │ │
│  │  - Tailwind CSS │    │  │    - gateway.rs         │   │ │
│  │  - shadcn/ui    │    │  │    - nanobot.rs         │   │ │
│  └─────────────────┘    │  │    - env.rs             │   │ │
│         │               │  └─────────────────────────┘   │ │
│    invoke()             │              │                  │ │
│    events               │         std::process           │ │
└─────────│───────────────│──────────────│──────────────────┘ │
          │               │              │
          ▼               ▼              ▼
    ┌─────────┐    ┌────────────┐  ┌─────────────┐
    │  OS     │    │  nanobot   │  │  ~/.nano-   │
    │  WebView│    │  CLI (ext) │  │  cats-man/  │
    └─────────┘    └────────────┘  └─────────────┘
```

---

## 三、文件结构映射

### 3.1 整体目录结构

```
nanocats-manager/
├── src/                          # Next.js 前端 (静态导出)
│   ├── app/                      # App Router pages
│   ├── components/               # React 组件
│   ├── lib/                     # 工具函数
│   │   ├── tauri-commands.ts    # [新增] Tauri IPC 适配层
│   │   └── types.ts             # [保留] 前端类型
│   └── ...
├── src-tauri/                    # [新增] Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs              # Tauri app entry
│   │   ├── lib.rs               # Module exports
│   │   ├── commands/            # Tauri Commands
│   │   │   ├── mod.rs
│   │   │   ├── agents.rs       # Agent CRUD
│   │   │   ├── gateway.rs       # Start/stop, logs
│   │   │   ├── nanobot.rs       # Version, onboard
│   │   │   └── env.rs           # .env management
│   │   ├── process_manager.rs   # 进程管理
│   │   ├── store.rs             # JSON 持久化
│   │   ├── nanobot.rs           # CLI 发现与调用
│   │   ├── env.rs               # .env 解析
│   │   └── types.rs             # Rust 类型定义
│   ├── Cargo.toml
│   └── tauri.conf.json
└── ...
```

### 3.2 现有 → 目标 文件对照

| 现有文件 (Node.js) | 目标文件 (Rust) | 职责 |
|-------------------|-----------------|------|
| `src/lib/process-manager.ts` | `src-tauri/src/process_manager.rs` | spawn/kill, log buffer |
| `src/lib/nanobot.ts` | `src-tauri/src/nanobot.rs` | binary discovery, CLI calls |
| `src/lib/store.ts` | `src-tauri/src/store.rs` | JSON CRUD, disk scan |
| `src/lib/types.ts` | `src-tauri/src/types.rs` | 共享类型定义 |
| `src/app/api/agents/route.ts` | `src-tauri/src/commands/agents.rs` | Agent CRUD IPC |
| `src/app/api/agents/[id]/start/route.ts` | `src-tauri/src/commands/gateway.rs` | Gateway lifecycle |
| `src/app/api/agents/[id]/stop/route.ts` | `src-tauri/src/commands/gateway.rs` | Gateway lifecycle |
| `src/app/api/agents/[id]/logs/route.ts` | `src-tauri/src/commands/gateway.rs` | Log streaming |
| `src/app/api/nanobot/version/route.ts` | `src-tauri/src/commands/nanobot.rs` | nanobot version |
| `src/app/api/agents/[id]/env/route.ts` | `src-tauri/src/commands/env.rs` | .env management |

---

## 四、IPC 接口设计 (Tauri Commands)

### 4.1 接口列表

| Tauri Command | 参数 | 返回值 | 对应原有 API |
|---------------|------|--------|-------------|
| `get_agents` | - | `Vec<AgentInstance>` | `GET /api/agents` |
| `create_agent` | `CreateAgentInput` | `AgentInstance` | `POST /api/agents` |
| `delete_agent` | `agent_name: String` | `bool` | `DELETE /api/agents/[id]` |
| `start_gateway` | `agent_name: String` | `u32` (PID) | `POST /api/agents/[id]/start` |
| `stop_gateway` | `agent_name: String` | `()` | `POST /api/agents/[id]/stop` |
| `get_logs` | `agent_name: String` | `Vec<AgentLog>` | `GET /api/agents/[id]/logs` |
| `subscribe_logs` | `agent_name: String` | `Event unsubscribe` | WebSocket 替代 |
| `get_env` | `agent_name: String` | `String` | `GET /api/agents/[id]/env` |
| `update_env` | `agent_name, content` | `bool` | `POST /api/agents/[id]/env` |
| `get_nanobot_version` | - | `String` | `GET /api/nanobot/version` |
| `nanobot_onboard` | `config_path, workspace_path` | `()` | `POST /api/nanobot/update` |
| `open_folder` | `path: String` | `()` | `POST /api/open-folder` |

### 4.2 类型定义 (Rust)

```rust
// src-tauri/src/types.rs

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AgentInstance {
    pub name: String,
    #[serde(rename = "configPath")]
    pub config_path: String,
    #[serde(rename = "workspacePath")]
    pub workspace_path: String,
    pub port: u16,
    #[serde(rename = "webchatPort")]
    pub webchat_port: Option<u16>,
    pub status: AgentStatus,
    pub pid: Option<u32>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub role: Option<AgentRole>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum AgentStatus {
    Running,
    Stopped,
    Error,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum AgentRole {
    Manager,
    Member,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AgentLog {
    pub timestamp: String,
    pub stream: LogStream,
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum LogStream {
    #[serde(rename = "stdout")]
    Stdout,
    #[serde(rename = "stderr")]
    Stderr,
}

#[derive(Serialize, Deserialize)]
pub struct CreateAgentInput {
    pub name: String,
    #[serde(default = "default_base_path")]
    pub base_path: String,
    pub port: Option<u16>,
    pub provider: Option<String>,
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    pub model: Option<String>,
    pub role: Option<AgentRole>,
}

fn default_base_path() -> String {
    dirs::home_dir()
        .map(|h| h.join("agents").to_string_lossy().to_string())
        .unwrap_or_else(|| "/Users/user/agents".to_string())
}
```

---

## 五、实施计划

### 阶段总览

| 阶段 | 工期 | 主要任务 |
|------|------|----------|
| Phase 1 | 1 周 | Next.js 静态导出适配 + Tauri 项目搭建 |
| Phase 2 | 2-3 周 | Rust 后端核心模块实现 |
| Phase 3 | 1 周 | IPC 联调 + 跨平台打包 |
| Phase 4 | 1 周 | 测试 + Bug 修复 + 发布 |

**总工期**: ~5-6 周

---

### Phase 1: 前端适配 + Tauri 项目搭建

#### 1.1 Next.js 静态导出配置

**文件**: `next.config.ts`

```typescript
const isProd = process.env.NODE_ENV === 'production';
const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

const nextConfig = {
  output: 'export',                    // 静态站点导出
  images: { unoptimized: true },       // 静态导出需要
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  trailingSlash: true,                // 兼容 Tauri dev server
  // Tauri 开发时需要忽略某些服务端特性
  experimental: {
    // 根据需要添加
  }
};

export default nextConfig;
```

#### 1.2 Tauri 项目初始化

```bash
# 创建 Tauri 项目 (在 nanocats-manager 根目录)
npm install -D @tauri-apps/cli
npm tauri init

# 或者使用 Cargo 直接创建
cargo create tauri-app src-tauri
```

#### 1.3 前端 IPC 适配层

**新文件**: `src/lib/tauri-commands.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { AgentInstance, AgentLog, CreateAgentInput } from './types';

// ============ Agent CRUD ============

export async function getAgents(): Promise<AgentInstance[]> {
  return invoke<AgentInstance[]>('get_agents');
}

export async function createAgent(input: CreateAgentInput): Promise<AgentInstance> {
  return invoke<AgentInstance>('create_agent', { input });
}

export async function deleteAgent(agentName: string): Promise<boolean> {
  return invoke<boolean>('delete_agent', { agentName });
}

// ============ Gateway Lifecycle ============

export async function startGateway(agentName: string): Promise<number> {
  return invoke<number>('start_gateway', { agentName });
}

export async function stopGateway(agentName: string): Promise<void> {
  return invoke<void>('stop_gateway', { agentName });
}

export async function getLogs(agentName: string): Promise<AgentLog[]> {
  return invoke<AgentLog[]>('get_logs', { agentName });
}

// ============ Log Streaming (Tauri Events) ============

export async function subscribeToLogs(
  agentName: string,
  callback: (log: AgentLog) => void
): Promise<UnlistenFn> {
  return listen<AgentLog>(`agent-log::${agentName}`, (event) => {
    callback(event.payload);
  });
}

// ============ Nanobot ============

export async function getNanobotVersion(): Promise<string> {
  return invoke<string>('get_nanobot_version');
}

export async function nanobotOnboard(
  configPath: string,
  workspacePath: string
): Promise<void> {
  return invoke<void>('nanobot_onboard', { configPath, workspacePath });
}

// ============ Env Management ============

export async function getEnv(agentName: string): Promise<string> {
  return invoke<string>('get_env', { agentName });
}

export async function updateEnv(
  agentName: string,
  content: string
): Promise<boolean> {
  return invoke<boolean>('update_env', { agentName, content });
}

// ============ Utilities ============

export async function openFolder(path: string): Promise<void> {
  return invoke<void>('open_folder', { path });
}
```

#### 1.4 API 调用替换规则

| 原有调用 | 替换为 |
|----------|--------|
| `fetch('/api/agents')` | `getAgents()` |
| `fetch('/api/agents', { method: 'POST', body: ... })` | `createAgent(input)` |
| `fetch('/api/agents/${name}/start', { method: 'POST' })` | `startGateway(name)` |
| `fetch('/api/agents/${name}/stop', { method: 'POST' })` | `stopGateway(name)` |
| `fetch('/api/agents/${name}/logs')` | `getLogs(name)` |
| SSE/log streaming | `subscribeToLogs(name, callback)` |

---

### Phase 2: Rust 后端实现

#### 2.1 Cargo.toml 依赖

```toml
[package]
name = "nanocats-manager"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["devtools"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
log = "0.4"
env_logger = "0.11"
dirs = "5"
chrono = "0.4"
thiserror = "1"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

#### 2.2 process_manager.rs (核心模块)

```rust
// src-tauri/src/process_manager.rs

use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter};
use crate::types::{AgentInstance, AgentLog, LogStream};

const MAX_LOG_LINES: usize = 1000;

pub struct ProcessManager {
    processes: HashMap<String, Child>,
    logs: HashMap<String, Vec<AgentLog>>,
    subscribers: HashMap<String, Vec<tauri::Handler<()>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: HashMap::new(),
            logs: HashMap::new(),
            subscribers: HashMap::new(),
        }
    }

    pub fn start_gateway(&mut self, app: &AppHandle, agent: &AgentInstance) -> Result<u32, String> {
        // 1. 查找 nanobot 二进制
        let nanobot_path = crate::nanobot::find_nanobot_binary()?;

        // 2. 构建命令参数
        let cli_args = vec![
            "gateway".to_string(),
            "--config".to_string(),
            agent.config_path.clone(),
            "--port".to_string(),
            agent.port.to_string(),
        ];

        log::info!("[CLI START] {} {}", nanobot_path, cli_args.join(" "));

        // 3. 加载 .env 文件
        let env_vars = crate::env::load_agent_env(&agent.name)?;

        // 4. Spawn 进程
        let child = Command::new(&nanobot_path)
            .args(&cli_args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&agent.workspace_path)
            .envs(&env_vars)
            .spawn()
            .map_err(|e| format!("Failed to spawn: {}", e))?;

        let pid = child.id();
        self.processes.insert(agent.name.clone(), child);

        // 5. 启动日志读取线程
        self.spawn_log_reader(app, agent.name.clone(), pid);

        Ok(pid)
    }

    pub fn stop_gateway(&mut self, agent_name: &str) -> Result<(), String> {
        use std::process::Termination;

        let child = self.processes.get_mut(agent_name)
            .ok_or_else(|| "Process not found".to_string())?;

        let pid = child.id();
        log::info!("[CLI STOP] kill -TERM {}", pid);

        // SIGTERM
        child.kill(std::process::Signal::SIGTERM)
            .map_err(|e| e.to_string())?;

        // 等待 3 秒
        std::thread::sleep(std::time::Duration::from_secs(3));

        // 如果还活着，SIGKILL
        if let Ok(_) = child.try_wait() {
            if let Some(p) = self.processes.get(agent_name) {
                if p.id().is_some() {
                    log::info!("[CLI STOP] kill -KILL {}", pid);
                    child.kill(std::process::Signal::SIGKILL)
                        .map_err(|e| e.to_string())?;
                }
            }
        }

        self.processes.remove(agent_name);
        Ok(())
    }

    pub fn is_running(&self, agent_name: &str) -> bool {
        if let Some(child) = self.processes.get(agent_name) {
            return child.try_wait().ok().flatten().is_none();
        }
        false
    }

    pub fn get_logs(&self, agent_name: &str) -> Vec<AgentLog> {
        self.logs.get(agent_name).cloned().unwrap_or_default()
    }

    fn spawn_log_reader(&mut self, app: &AppHandle, agent_name: String, pid: u32) {
        // 实现 stdout/stderr 读取和事件发送
        // 使用 tauri::event::emit 发送日志到前端
    }
}
```

#### 2.3 store.rs (持久化)

```rust
// src-tauri/src/store.rs

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::types::AgentInstance;

const STORE_DIR: &str = ".nanocats-manager";
const STORE_FILE: &str = "agents-store.json";
const AGENTS_BASE_PATH: &str = "agents";

fn get_store_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(STORE_DIR).join(STORE_FILE))
        .unwrap_or_else(|| PathBuf::from(STORE_FILE))
}

pub fn ensure_store() -> Result<(), String> {
    let path = get_store_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if !path.exists() {
        fs::write(&path, "[]").map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_agents() -> Result<Vec<AgentInstance>, String> {
    ensure_store()?;
    let path = get_store_path();
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_agents(agents: &[AgentInstance]) -> Result<(), String> {
    ensure_store()?;
    let path = get_store_path();
    let content = serde_json::to_string_pretty(agents).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

// ... 其他 CRUD 操作
```

#### 2.4 nanobot.rs (CLI 发现与调用)

```rust
// src-tauri/src/nanobot.rs

use std::path::PathBuf;
use std::process::Command;
use std::env;

pub fn find_nanobot_binary() -> Result<String, String> {
    // 1. NANOBOT_BIN 环境变量
    if let Ok(path) = env::var("NANOBOT_BIN") {
        if PathBuf::from(&path).exists() {
            return Ok(path);
        }
    }

    // 2. which nanobot
    if let Ok(output) = Command::new("which").arg("nanobot").output() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() && PathBuf::from(&path).exists() {
            return Ok(path);
        }
    }

    // 3. 常见路径 (跨平台)
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let candidates = vec![
        home.join(".local/share/uv/tools/nanobot-ai/bin/nanobot"),
        home.join(".local/bin/nanobot"),
        home.join("workspace/ai/nanobot/.venv/bin/nanobot"),
        PathBuf::from("/opt/homebrew/bin/nanobot"),
        PathBuf::from("/usr/local/bin/nanobot"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    Err("Cannot find nanobot binary".to_string())
}

pub fn nanobot_onboard(config_path: &str, workspace_path: &str) -> Result<(), String> {
    let nanobot_path = find_nanobot_binary()?;

    let output = Command::new(&nanobot_path)
        .args(&["onboard", "--config", config_path, "--workspace", workspace_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

pub fn nanobot_version() -> Result<String, String> {
    let nanobot_path = find_nanobot_binary()?;

    let output = Command::new(&nanobot_path)
        .arg("--version")
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
```

#### 2.5 Tauri Commands 实现

```rust
// src-tauri/src/commands/agents.rs

use tauri::command;
use crate::types::{AgentInstance, CreateAgentInput};
use crate::store;
use crate::nanobot;

#[command]
pub fn get_agents() -> Result<Vec<AgentInstance>, String> {
    store::get_agents()
}

#[command]
pub fn create_agent(input: CreateAgentInput) -> Result<AgentInstance, String> {
    // 1. 调用 nanobot onboard
    // 2. 创建 AgentInstance
    // 3. 保存到 store
    // 4. 返回创建的 agent
    todo!()
}

#[command]
pub fn delete_agent(agent_name: String) -> Result<bool, String> {
    store::delete_agent(&agent_name)
}
```

```rust
// src-tauri/src/commands/gateway.rs

use tauri::{command, AppHandle, State};
use crate::process_manager::ProcessManager;
use crate::types::AgentInstance;

#[command]
pub fn start_gateway(
    agent_name: String,
    state: State<'_, ProcessManager>,
    app: AppHandle,
) -> Result<u32, String> {
    let agent = store::get_agent(&agent_name)?;
    state.start_gateway(&app, &agent)
}

#[command]
pub fn stop_gateway(
    agent_name: String,
    state: State<'_, ProcessManager>,
) -> Result<(), String> {
    state.stop_gateway(&agent_name)
}

#[command]
pub fn get_logs(agent_name: String, state: State<'_, ProcessManager>) -> Vec<AgentLog> {
    state.get_logs(&agent_name)
}
```

---

### Phase 3: Tauri 配置与构建

#### 3.1 tauri.conf.json

```json
{
  "productName": "NanoCats Manager",
  "version": "0.1.0",
  "identifier": "com.nanocats.manager",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out",
    "devtools": true
  },
  "app": {
    "windows": [
      {
        "title": "NanoCats Manager",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis", "app", "dmg", "deb", "rpm", "appimage"],
    "category": "DeveloperTool",
    "shortDescription": "Desktop dashboard for nanobot agents",
    "longDescription": "A sleek desktop application for managing nanobot AI agent instances and teams.",
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "linux": {
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  }
}
```

#### 3.2 构建命令

```bash
# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build

# 输出位置
# macOS: src-tauri/target/release/bundle/dmg/*.dmg
# Windows: src-tauri/target/release/bundle/nsis/*.exe
# Linux: src-tauri/target/release/bundle/appimage/*.AppImage
```

---

## 六、跨平台注意事项

### 6.1 路径处理

| 场景 | macOS/Linux | Windows |
|------|-------------|---------|
| Home 目录 | `~/.nanocats-manager` | `%USERPROFILE%\.nanocats-manager` |
| Agents 目录 | `~/agents/` | `%USERPROFILE%\agents\` |
| nanobot 路径 | `/opt/homebrew/bin/nanobot`, `~/.local/bin/nanobot` | `C:\Program Files\nanobot`, `%LOCALAPPDATA%\nanobot` |
| 路径分隔符 | `/` | `\` |

**Rust 建议**: 使用 `dirs::home_dir()`, `PathBuf`, `std::path::Path` 等跨平台 API

### 6.2 nanobot 路径发现 (Windows 补充)

```rust
// Windows 额外检查路径
#[cfg(target_os = "windows")]
fn additional_windows_paths() -> Vec<PathBuf> {
    vec![
        PathBuf::from("C:\\Program Files\\nanobot\\nanobot.exe"),
        PathBuf::from("C:\\Program Files (x86)\\nanobot\\nanobot.exe"),
        dirs::data_local_dir()
            .map(|p| p.join("nanobot").join("nanobot.exe"))
            .unwrap_or_default(),
    ]
}
```

### 6.3 日志文件路径

```rust
const CLI_LOG_DIR: &str = ".nanocats-manager/logs";
const CLI_LOG_FILE: &str = "cli-commands.log";
```

---

## 七、风险与缓解

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| nanobot CLI 路径 | 不同平台安装位置不同 | 完善路径发现逻辑，包含 Windows |
| .env encoding | 跨平台编码问题 | 确保 UTF-8 处理 |
| 日志性能 | 高频日志影响 UI | 使用 Tauri Events，控制 buffer |
| 进程僵尸 | 子进程未正确退出 | SIGTERM → 3s → SIGKILL |
| 路径分隔符 | Windows `\` vs Unix `/` | 使用 `Path` API |
| 静态导出限制 | Next.js 某些功能不可用 | 检查 `output: 'export'` 限制 |

---

## 八、Milestones

| Week | Milestone | 交付物 |
|------|-----------|--------|
| 1 | Phase 1 完成 | Next.js 静态导出 + Tauri shell 项目 |
| 2-3 | Phase 2 核心完成 | Rust ProcessManager, Store, Nanobot |
| 4 | Phase 2 完善 + IPC 联调 | 所有 Commands 实现 |
| 5 | Phase 3 完成 | 跨平台构建成功 |
| 6 | 测试 + Bug 修复 | 稳定版发布 |

---

## 九、参考文档

- [Tauri 官方文档 - Next.js Integration](https://v2.tauri.app/start/frontend/nextjs)
- [Tauri GitHub Docs](https://github.com/tauri-apps/tauri-docs)
- [Tauri 2.0 Migration Guide](https://v2.tauri.app/start/migrate/)
- [Electron Performance](https://github.com/electron/electron/blob/main/docs/tutorial/performance.md)
- [Expo macOS Support](https://docs.expo.dev/modules/additional-platform-support/)
