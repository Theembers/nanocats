"""Data models for database records."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class TokenUsageRecord:
    timestamp: str
    agent_id: str | None
    model: str | None
    provider: str | None
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cache_hit: int
    session_key: str


@dataclass
class LogRecord:
    timestamp: str
    level: str | None
    type: str | None
    agent_id: str | None
    session_key: str | None
    channel: str | None
    message: str | None
    metadata: str | None
    tool_name: str | None


def token_to_dict(record: TokenUsageRecord) -> dict[str, Any]:
    return {
        "timestamp": record.timestamp,
        "agent_id": record.agent_id,
        "model": record.model,
        "provider": record.provider,
        "input_tokens": record.input_tokens,
        "output_tokens": record.output_tokens,
        "total_tokens": record.total_tokens,
        "cache_hit": record.cache_hit,
        "session_key": record.session_key,
    }


def log_to_dict(record: LogRecord) -> dict[str, Any]:
    return {
        "timestamp": record.timestamp,
        "level": record.level,
        "type": record.type,
        "agent_id": record.agent_id,
        "session_key": record.session_key,
        "channel": record.channel,
        "message": record.message,
        "metadata": record.metadata,
        "tool_name": record.tool_name,
    }
