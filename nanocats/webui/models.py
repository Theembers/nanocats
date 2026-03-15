"""WebUI API models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ============================================================================
# Auth Models
# ============================================================================


class User(BaseModel):
    """User model."""

    user_id: str
    name: str
    role: str = "user"
    created_at: datetime | None = None
    last_login: datetime | None = None


class UserCreate(BaseModel):
    """Request model for creating a user."""

    user_id: str
    password: str
    name: str
    role: str = "user"


class LoginRequest(BaseModel):
    """Request model for login."""

    user_id: str
    password: str


class LoginResponse(BaseModel):
    """Response model for login."""

    token: str
    user: User


# ============================================================================
# Agent Models
# ============================================================================


class AgentListItem(BaseModel):
    """Agent list item model."""

    id: str
    name: str
    type: str
    model: str
    provider: str
    workspace: str
    accessible_channels: list[str] = Field(default_factory=list)
    allow_from: list[str] = Field(default_factory=list)


class AgentListResponse(BaseModel):
    """Response model for agent list."""

    agents: list[AgentListItem]


class AgentDetailResponse(BaseModel):
    """Response model for agent detail."""

    id: str
    name: str
    type: str
    model: str
    provider: str
    auto_start: bool = True
    channels: dict[str, Any] = Field(default_factory=dict)


class AgentUpdateRequest(BaseModel):
    """Request model for updating agent."""

    name: str | None = None
    model: str | None = None
    provider: str | None = None
    auto_start: bool | None = None


# ============================================================================
# Channel Models
# ============================================================================


class ChannelInfo(BaseModel):
    """Channel info model."""

    name: str
    enabled: bool
    display_name: str


class ChannelListResponse(BaseModel):
    """Response model for channel list."""

    channels: list[ChannelInfo]


class ChannelUpdateRequest(BaseModel):
    """Request model for updating channel."""

    enabled: bool


# ============================================================================
# Workspace Models
# ============================================================================


class WorkspaceFileResponse(BaseModel):
    """Response model for workspace file."""

    file: str
    content: str
    last_modified: datetime | None = None


class WorkspaceFileRequest(BaseModel):
    """Request model for workspace file."""

    content: str


# ============================================================================
# Skill Models
# ============================================================================


class BuiltinSkill(BaseModel):
    """Builtin skill model."""

    name: str
    description: str
    path: str


class WorkspaceSkill(BaseModel):
    """Workspace skill model."""

    name: str
    description: str
    path: str
    enabled: bool = True


class SkillListResponse(BaseModel):
    """Response model for skill list."""

    builtin: list[BuiltinSkill] = Field(default_factory=list)
    workspace: list[WorkspaceSkill] = Field(default_factory=list)


class SkillCreateRequest(BaseModel):
    """Request model for creating skill."""

    name: str
    description: str
    content: str


# ============================================================================
# MCP Models
# ============================================================================


class MCPServer(BaseModel):
    """MCP server model."""

    type: str | None = None
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    url: str | None = None
    headers: dict[str, str] = Field(default_factory=dict)
    tool_timeout: int = 30
    enabled: bool = True


class MCPListResponse(BaseModel):
    """Response model for MCP list."""

    servers: dict[str, MCPServer] = Field(default_factory=dict)


class MCPCreateRequest(BaseModel):
    """Request model for creating MCP server."""

    name: str
    type: str | None = None
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    url: str | None = None
    headers: dict[str, str] = Field(default_factory=dict)
    tool_timeout: int = 30
    enabled: bool = True


# ============================================================================
# Cron Models
# ============================================================================


class CronSchedule(BaseModel):
    """Cron schedule model."""

    kind: str = "cron"
    expr: str
    tz: str = "UTC"


class CronPayload(BaseModel):
    """Cron payload model."""

    kind: str = "system_event"
    message: str
    deliver: bool = True
    channel: str | None = None
    to: str | None = None


class CronJob(BaseModel):
    """Cron job model."""

    id: str
    name: str
    enabled: bool = True
    schedule: CronSchedule
    payload: CronPayload


class CronListResponse(BaseModel):
    """Response model for cron list."""

    jobs: list[CronJob] = Field(default_factory=list)


class CronCreateRequest(BaseModel):
    """Request model for creating cron job."""

    name: str
    enabled: bool = True
    schedule: CronSchedule
    payload: CronPayload


class CronUpdateRequest(BaseModel):
    """Request model for updating cron job."""

    name: str | None = None
    enabled: bool | None = None
    schedule: CronSchedule | None = None
    payload: CronPayload | None = None


# ============================================================================
# Memory Models
# ============================================================================


class MemoryContent(BaseModel):
    """Memory content model."""

    content: str
    last_modified: datetime | None = None


class MemoryResponse(BaseModel):
    """Response model for memory."""

    memory: MemoryContent | None = None
    history: MemoryContent | None = None


class MemoryRequest(BaseModel):
    """Request model for memory."""

    content: str


# ============================================================================
# Message Models
# ============================================================================


class Message(BaseModel):
    """Message model."""

    id: str
    role: str
    content: str
    timestamp: datetime | None = None
    channel: str | None = None
    chat_id: str | None = None
    tool_calls: list[dict[str, Any]] | None = None


class MessageListResponse(BaseModel):
    """Response model for message list."""

    messages: list[Message]
    pagination: dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Queue Models
# ============================================================================


class QueueItem(BaseModel):
    """Queue item model."""

    id: str
    content: str
    channel: str | None = None
    chat_id: str | None = None
    status: str = "pending"
    created_at: datetime | None = None


class QueueListResponse(BaseModel):
    """Response model for queue list."""

    queue: list[QueueItem] = Field(default_factory=list)


class QueueCreateRequest(BaseModel):
    """Request model for creating queue item."""

    content: str
    channel: str | None = None
    chat_id: str | None = None
