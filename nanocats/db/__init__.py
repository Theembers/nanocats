"""SQLite database module for token usage and structured logging."""

from nanocats.db.config import BUFFER_SIZE, DATA_DIR, DB_PATH, FLUSH_INTERVAL
from nanocats.db.database import Database
from nanocats.db.models import LogRecord, TokenUsageRecord, log_to_dict, token_to_dict
from nanocats.db.repository import LogRepository, TokenRepository, create_tables


async def get_db() -> Database:
    return await Database.get_instance()


def record_token(
    agent_id: str,
    model: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    cache_hit: int = 0,
    session_key: str = "",
) -> None:
    if Database._instance:
        Database._instance.record_token(
            agent_id, model, provider, input_tokens, output_tokens, cache_hit, session_key
        )


def record_log(
    level: str,
    log_type: str,
    message: str,
    agent_id: str = "",
    session_key: str = "",
    channel: str = "",
    metadata: dict | None = None,
    tool_name: str = "",
) -> None:
    if Database._instance:
        Database._instance.record_log(
            level, log_type, message, agent_id, session_key, channel, metadata, tool_name
        )


def loguru_sink(message: "logger") -> None:
    record_log(
        level=message.level.name,
        log_type="system",
        message=message.record["message"],
        agent_id=message.record.get("extra", {}).get("agent_id", ""),
        session_key=message.record.get("extra", {}).get("session_key", ""),
        channel=message.record.get("extra", {}).get("channel", ""),
    )


__all__ = [
    "Database",
    "get_db",
    "record_token",
    "record_log",
    "loguru_sink",
    "DATA_DIR",
    "DB_PATH",
    "BUFFER_SIZE",
    "FLUSH_INTERVAL",
    "TokenRepository",
    "LogRepository",
    "create_tables",
    "TokenUsageRecord",
    "LogRecord",
    "token_to_dict",
    "log_to_dict",
]
