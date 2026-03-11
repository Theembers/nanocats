"""Web backend for nanocats - Agent management and chat interface."""

import asyncio
import json
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from nanocats.config.paths import get_workspace_path
from nanocats.config.loader import load_config, load_agent_config, save_agent_config
from nanocats.config.schema import AgentInstanceConfig, AgentPersonalityConfig

# Configuration
SECRET_KEY = "nanocats-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
DATABASE_PATH = Path(get_workspace_path()) / "web.db"
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str
    agent_id: str
    agent_type: str

class TokenData(BaseModel):
    agent_id: Optional[str] = None
    agent_type: Optional[str] = None

class LoginRequest(BaseModel):
    agent_id: str
    token: str

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class AgentConfigUpdate(BaseModel):
    name: Optional[str] = None
    personality: Optional[dict] = None
    model: Optional[str] = None
    provider: Optional[str] = None

class MCPServerConfig(BaseModel):
    name: str
    command: Optional[str] = None
    args: Optional[list] = None
    url: Optional[str] = None
    headers: Optional[dict] = None

class SkillConfig(BaseModel):
    name: str
    enabled: bool = True

class TokenUsage(BaseModel):
    timestamp: str
    agent_id: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cached: bool = False

# Database initialization
def init_db():
    """Initialize SQLite database."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Agents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'user',
            token_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Token usage table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS token_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            agent_id TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            cached BOOLEAN DEFAULT 0,
            cost REAL DEFAULT 0.0
        )
    """)
    
    # Logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            agent_id TEXT,
            level TEXT DEFAULT 'INFO',
            category TEXT,
            message TEXT,
            details TEXT
        )
    """)
    
    # Conversations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    """)
    
    conn.commit()
    conn.close()

def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_agent(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Validate JWT token and return agent info."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        agent_id: str = payload.get("sub")
        agent_type: str = payload.get("type")
        if agent_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return TokenData(agent_id=agent_id, agent_type=agent_type)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan manager."""
    init_db()
    print("\n" + "="*60)
    print("🐱 nanocats Web Interface")
    print("="*60)
    print(f"📱 Web UI:   http://localhost:15751")
    print(f"📚 API Docs: http://localhost:15751/docs")
    print("="*60)
    print("\nLogin with your agent token to start chatting!")
    print("="*60 + "\n")
    yield

app = FastAPI(
    title="nanocats Web",
    description="Web interface for nanocats Agent Swarm",
    version="0.1.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    """Login with agent ID and token."""
    # Load main config
    config = load_config()
    
    # Load agent config to verify
    agent_config = load_agent_config(request.agent_id, config)
    
    # Determine agent type
    agent_type = "user"
    
    if agent_config is None:
        # Agent not found - only allow login with admin token for new agents
        if request.token != "admin":
            raise HTTPException(status_code=401, detail="Invalid agent ID or token")
        # Create a default agent type for admin login
        agent_type = "user"
    else:
        # Agent exists - verify token
        agent_type = agent_config.type if hasattr(agent_config, 'type') else "user"
        expected_token = agent_config.token if hasattr(agent_config, 'token') else None
        
        # Allow admin token or configured token
        if request.token != "admin" and request.token != expected_token:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": request.agent_id, "type": agent_type}
    )
    
    # Log login
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO logs (agent_id, category, message) VALUES (?, ?, ?)",
        (request.agent_id, "auth", "User logged in")
    )
    conn.commit()
    conn.close()
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        agent_id=request.agent_id,
        agent_type=agent_type
    )

@app.get("/api/agent/me")
async def get_current_agent_info(current_agent: TokenData = Depends(get_current_agent)):
    """Get current agent information."""
    config = load_config()
    agent_config = load_agent_config(current_agent.agent_id, config)
    if agent_config is None:
        return {
            "id": current_agent.agent_id,
            "name": current_agent.agent_id,
            "type": current_agent.agent_type or "user",
            "model": None,
            "provider": None,
        }
    return {
        "id": current_agent.agent_id,
        "name": agent_config.name,
        "type": agent_config.type,
        "model": agent_config.model if hasattr(agent_config, 'model') else None,
        "provider": agent_config.provider if hasattr(agent_config, 'provider') else None,
    }

@app.get("/api/agent/config")
async def get_agent_config(current_agent: TokenData = Depends(get_current_agent)):
    """Get agent configuration."""
    config = load_config()
    agent_config = load_agent_config(current_agent.agent_id, config)
    if agent_config is None:
        return {
            "id": current_agent.agent_id,
            "name": current_agent.agent_id,
            "type": "user",
            "workspace": None,
            "model": None,
            "provider": None,
            "personality": None,
            "mcp": None,
            "skills": None,
            "channels": None,
        }
    return {
        "id": agent_config.id,
        "name": agent_config.name,
        "type": agent_config.type,
        "workspace": agent_config.workspace,
        "model": agent_config.model if hasattr(agent_config, 'model') else None,
        "provider": agent_config.provider if hasattr(agent_config, 'provider') else None,
        "personality": agent_config.personality.model_dump() if hasattr(agent_config, 'personality') else None,
        "mcp": agent_config.mcp.model_dump() if hasattr(agent_config, 'mcp') else None,
        "skills": agent_config.skills.model_dump() if hasattr(agent_config, 'skills') else None,
        "channels": agent_config.channels.model_dump() if hasattr(agent_config, 'channels') else None,
    }

@app.put("/api/agent/config")
async def update_agent_config(
    config_update: AgentConfigUpdate,
    current_agent: TokenData = Depends(get_current_agent)
):
    """Update agent configuration."""
    main_config = load_config()
    agent_config = load_agent_config(current_agent.agent_id, main_config)
    
    if agent_config is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if config_update.name:
        agent_config.name = config_update.name
    if config_update.model:
        agent_config.model = config_update.model
    if config_update.provider:
        agent_config.provider = config_update.provider
    if config_update.personality:
        agent_config.personality = AgentPersonalityConfig(**config_update.personality)
    
    save_agent_config(agent_config, main_config)
    
    # Log config update
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO logs (agent_id, category, message, details) VALUES (?, ?, ?, ?)",
        (current_agent.agent_id, "config", "Configuration updated", json.dumps(config_update.model_dump()))
    )
    conn.commit()
    conn.close()
    
    return {"status": "success"}

@app.get("/api/conversations")
async def get_conversations(current_agent: TokenData = Depends(get_current_agent)):
    """Get agent's conversations."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM conversations WHERE agent_id = ? ORDER BY updated_at DESC",
        (current_agent.agent_id,)
    )
    conversations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return conversations

@app.post("/api/conversations")
async def create_conversation(current_agent: TokenData = Depends(get_current_agent)):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (id, agent_id, title) VALUES (?, ?, ?)",
        (conversation_id, current_agent.agent_id, "New Chat")
    )
    conn.commit()
    conn.close()
    return {"id": conversation_id, "title": "New Chat"}

@app.get("/api/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_agent: TokenData = Depends(get_current_agent)
):
    """Get messages in a conversation."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify conversation belongs to agent
    cursor.execute(
        "SELECT * FROM conversations WHERE id = ? AND agent_id = ?",
        (conversation_id, current_agent.agent_id)
    )
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    cursor.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp",
        (conversation_id,)
    )
    messages = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return messages

@app.post("/api/chat")
async def chat(
    message: ChatMessage,
    current_agent: TokenData = Depends(get_current_agent)
):
    """Send a chat message and get response."""
    conversation_id = message.conversation_id or str(uuid.uuid4())
    
    # Store user message
    conn = get_db()
    cursor = conn.cursor()
    
    # Create conversation if not exists
    cursor.execute(
        "INSERT OR IGNORE INTO conversations (id, agent_id, title) VALUES (?, ?, ?)",
        (conversation_id, current_agent.agent_id, "Chat")
    )
    
    cursor.execute(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        (conversation_id, "user", message.message)
    )
    
    # Update conversation timestamp
    cursor.execute(
        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (conversation_id,)
    )
    
    conn.commit()
    conn.close()
    
    # TODO: Integrate with actual agent loop for response
    # For now, return a placeholder response
    response_content = f"Echo: {message.message}"
    
    # Store assistant response
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        (conversation_id, "assistant", response_content)
    )
    conn.commit()
    conn.close()
    
    # Log chat
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO logs (agent_id, category, message) VALUES (?, ?, ?)",
        (current_agent.agent_id, "chat", f"User message: {message.message[:50]}...")
    )
    conn.commit()
    conn.close()
    
    return {
        "response": response_content,
        "conversation_id": conversation_id
    }

@app.get("/api/mcp/servers")
async def get_mcp_servers(current_agent: TokenData = Depends(get_current_agent)):
    """Get MCP servers configuration."""
    # Load global MCP config
    global_config = load_config()
    mcp_servers = global_config.tools.mcpServers if hasattr(global_config.tools, 'mcpServers') else {}
    
    # Load agent-specific MCP config
    agent_config = load_agent_config(current_agent.agent_id, global_config)
    agent_mcp = agent_config.mcp if agent_config and hasattr(agent_config, 'mcp') else None
    
    return {
        "global": {name: {"command": cfg.command, "args": cfg.args} for name, cfg in mcp_servers.items()},
        "agent": agent_mcp.model_dump() if agent_mcp else None,
        "can_install_global": current_agent.agent_type == "supervisor"
    }

@app.get("/api/skills")
async def get_skills(current_agent: TokenData = Depends(get_current_agent)):
    """Get available skills."""
    # Load global skills
    global_config = load_config()
    
    # Load agent-specific skills
    agent_config = load_agent_config(current_agent.agent_id, global_config)
    agent_skills = agent_config.skills if agent_config and hasattr(agent_config, 'skills') else None
    
    return {
        "global": [],  # TODO: Load from skills directory
        "agent": agent_skills.model_dump() if agent_skills else None,
        "can_install_global": current_agent.agent_type == "supervisor"
    }

@app.get("/api/stats/tokens")
async def get_token_stats(
    days: int = 7,
    agent_id: Optional[str] = None,
    current_agent: TokenData = Depends(get_current_agent)
):
    """Get token usage statistics."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Build query
    query = """
        SELECT 
            date(timestamp) as date,
            agent_id,
            model,
            SUM(prompt_tokens) as prompt_tokens,
            SUM(completion_tokens) as completion_tokens,
            SUM(total_tokens) as total_tokens,
            SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) as cache_hits,
            COUNT(*) as total_calls
        FROM token_usage
        WHERE timestamp >= date('now', '-{} days')
    """.format(days)
    
    params = []
    
    # Filter by agent if specified or if not supervisor
    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    elif current_agent.agent_type != "supervisor":
        query += " AND agent_id = ?"
        params.append(current_agent.agent_id)
    
    query += " GROUP BY date(timestamp), agent_id, model ORDER BY date DESC"
    
    cursor.execute(query, params)
    stats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return stats

@app.get("/api/logs")
async def get_logs(
    category: Optional[str] = None,
    level: Optional[str] = None,
    limit: int = 100,
    current_agent: TokenData = Depends(get_current_agent)
):
    """Get system logs."""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM logs WHERE 1=1"
    params = []
    
    # Filter by agent if not supervisor
    if current_agent.agent_type != "supervisor":
        query += " AND (agent_id = ? OR agent_id IS NULL)"
        params.append(current_agent.agent_id)
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    if level:
        query += " AND level = ?"
        params.append(level)
    
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs

@app.get("/api/admin/agents")
async def get_all_agents(current_agent: TokenData = Depends(get_current_agent)):
    """Get all agents (supervisor only)."""
    if current_agent.agent_type != "supervisor":
        raise HTTPException(status_code=403, detail="Only supervisor can view all agents")
    
    # Load from config
    from nanocats.config.loader import load_agent_configs
    agents = load_agent_configs()
    
    return [
        {
            "id": agent.id,
            "name": agent.name,
            "type": agent.type,
            "model": agent.model if hasattr(agent, 'model') else None,
        }
        for agent in agents
    ]

# Static files - serve built frontend
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the frontend app."""
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>nanocats Web</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
        <div id="root">
            <div class="min-h-screen bg-gray-100 flex items-center justify-center">
                <div class="text-center">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">🐱 nanocats</h1>
                    <p class="text-gray-600">Web interface loading...</p>
                    <p class="text-sm text-gray-500 mt-4">Please build the frontend first:</p>
                    <code class="bg-gray-200 px-2 py-1 rounded text-sm">cd nanocats/web/frontend && npm install && npm run build</code>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/{path:path}", response_class=HTMLResponse)
async def catch_all(path: str):
    """Catch-all route for SPA routing."""
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=15751)
