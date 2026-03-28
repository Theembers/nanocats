![NanoCats Logo](nanocats_logo.png)

# 🐈 nanocats-manager: Web Dashboard for nanobot Agents
nanocats-manager is a sleek web-based dashboard for managing [nanobot](https://github.com/HKUDS/nanobot) agent instances and teams.

⚡️ Intuitive UI for agent lifecycle management — create, configure, start, and stop agents with ease.

🎯 Built on Next.js with a modern dark theme for comfortable all-day use.


## 📢 Features

| 🌐 Agent Management | 👥 Team Collaboration | 📊 Real-Time Monitoring | 🔧 Configuration |
| --- | --- | --- | --- |
| Create & Delete | Multi-Agent Teams | Live Status | Provider Setup |
| Start & Stop | Task Board | Log Streaming | Model Selection |
| Chat Interface | Team Templates | Version Display | Workspace Config |
| Skills Manager | Inbox & Tasks | Auto-Refresh | Cron Jobs |


## ✨ Key Capabilities

**🖥️ Agent Dashboard**
- View all agent instances at a glance
- One-click start/stop controls
- Real-time status updates with auto-refresh

**👥 Agent Teams (ClawTeam)**
- Organize agents into collaborative teams
- Visual task board with drag-and-drop
- Built-in inbox for inter-agent messaging
- Launch from pre-built templates

**📝 Configuration Management**
- Web-based config editor
- Provider and model selection
- Environment variable management
- Cron job scheduling

**📜 Log Viewer**
- Real-time log streaming
- stdout/stderr separation
- Timestamp display

**🧠 Memory & Skills**
- View agent memory contents
- Install and manage agent skills
- ClawHub integration


## 📦 Install

```bash
git clone https://github.com/HKUDS/nanocats-manager.git
cd nanocats-manager
npm install
```

### Dependencies

- [nanobot](https://github.com/HKUDS/nanobot) — The agent runtime
- Node.js 18+ / Next.js 15+


## 🚀 Quick Start

1. **Start the development server**

```bash
npm run dev
```

2. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

3. **Create your first agent**

Click **New Agent** and fill in the configuration:
- Agent name
- Port number
- Provider & model
- API key (if needed)

4. **Start chatting**

Click the play button to start your agent, then open the chat interface.


## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    nanocats-manager                          │
│                      (Next.js)                              │
├─────────────────────────────────────────────────────────────┤
│  Dashboard  │  Agents  │  Teams  │  Config  │  Logs        │
├─────────────────────────────────────────────────────────────┤
│                      API Routes                             │
│  /api/agents  │  /api/teams  │  /api/nanobot                │
├─────────────────────────────────────────────────────────────┤
│                    nanobot CLI                              │
│         (Process Manager & IPC)                             │
└─────────────────────────────────────────────────────────────┘
```


## 📁 Project Structure

```
nanocats-manager/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── agents/            # Agent management pages
│   │   ├── teams/             # Team collaboration pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── agent-card.tsx     # Agent display card
│   │   ├── agent-form.tsx     # Agent creation form
│   │   ├── file-editor.tsx    # Config editor
│   │   └── log-viewer.tsx      # Log display component
│   └── lib/                   # Utilities & types
│       ├── types.ts           # TypeScript interfaces
│       ├── nanobot.ts         # nanobot integration
│       └── process-manager.ts # Process lifecycle
├── public/                     # Static assets
└── README.md
```


## 🔌 API Reference

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/agents` | GET | List all agents |
| `/api/agents` | POST | Create new agent |
| `/api/agents/[id]/start` | POST | Start agent |
| `/api/agents/[id]/stop` | POST | Stop agent |
| `/api/agents/[id]/logs` | GET | Get agent logs |
| `/api/agents/[id]/config` | GET/PUT | Agent config |
| `/api/teams` | GET | List all teams |
| `/api/teams/[name]/board` | GET | Team task board |
| `/api/nanobot/version` | GET | nanobot version |
| `/api/nanobot/update` | POST | Update nanobot |


## 🎨 UI Screenshots

The dashboard features:
- Dark theme with orange accents
- Real-time status indicators
- Responsive layout for all screen sizes
- Animated card transitions


## 📚 Related Projects

- [🐈 nanobot](https://github.com/HKUDS/nanobot) — Ultra-lightweight personal AI assistant
- [ClawHub](https://github.com/HKUDS/clawhub) — Agent skills marketplace


## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.


## 📄 License

This project is for educational, research, and technical exchange purposes only.

> 🐈 nanocats-manager is developed by the HKUDS team.
