"""SQLite database module for token usage and structured logging."""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import aiosqlite
from loguru import logger

DATA_DIR = Path.home() / ".nanocats" / "data"
DB_PATH = DATA_DIR / "nanocats.db"

BUFFER_SIZE = 100
FLUSH_INTERVAL = 10


class Database:
    _instance = None
    _lock = asyncio.Lock()

    def __init__(self):
        self._db: aiosqlite.Connection | None = None
        self._token_buffer: list[dict[str, Any]] = []
        self._log_buffer: list[dict[str, Any]] = []
        self._flush_task: asyncio.Task | None = None

    @classmethod
    async def get_instance(cls) -> "Database":
        async with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
                await cls._instance._init()
            return cls._instance

    async def _init(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(DB_PATH)
        self._db.row_factory = aiosqlite.Row

        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS token_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                agent_id TEXT,
                model TEXT,
                provider TEXT,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                cache_hit INTEGER DEFAULT 0,
                session_key TEXT
            )
        """)

        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                level TEXT,
                type TEXT,
                agent_id TEXT,
                session_key TEXT,
                channel TEXT,
                message TEXT,
                metadata TEXT,
                tool_name TEXT
            )
        """)

        await self._db.execute(
            "CREATE INDEX IF NOT EXISTS idx_token_timestamp ON token_usage(timestamp)"
        )
        await self._db.execute(
            "CREATE INDEX IF NOT EXISTS idx_token_agent ON token_usage(agent_id)"
        )
        await self._db.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
        await self._db.execute("CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type)")
        await self._db.execute("CREATE INDEX IF NOT EXISTS idx_logs_agent ON logs(agent_id)")

        await self._db.commit()

        self._flush_task = asyncio.create_task(self._periodic_flush())

    async def _periodic_flush(self) -> None:
        while True:
            await asyncio.sleep(FLUSH_INTERVAL)
            await self._flush_buffers()

    async def _flush_buffers(self) -> None:
        if not self._db:
            return

        async with self._lock:
            if self._token_buffer:
                tokens_to_write = self._token_buffer.copy()
                self._token_buffer.clear()

                await self._db.executemany(
                    """INSERT INTO token_usage 
                       (timestamp, agent_id, model, provider, input_tokens, output_tokens, total_tokens, cache_hit, session_key)
                       VALUES (:timestamp, :agent_id, :model, :provider, :input_tokens, :output_tokens, :total_tokens, :cache_hit, :session_key)""",
                    tokens_to_write,
                )
                await self._db.commit()

            if self._log_buffer:
                logs_to_write = self._log_buffer.copy()
                self._log_buffer.clear()

                await self._db.executemany(
                    """INSERT INTO logs 
                       (timestamp, level, type, agent_id, session_key, channel, message, metadata, tool_name)
                       VALUES (:timestamp, :level, :type, :agent_id, :session_key, :channel, :message, :metadata, :tool_name)""",
                    logs_to_write,
                )
                await self._db.commit()

    def record_token(
        self,
        agent_id: str,
        model: str,
        provider: str,
        input_tokens: int,
        output_tokens: int,
        cache_hit: int = 0,
        session_key: str = "",
    ) -> None:
        self._token_buffer.append(
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "agent_id": agent_id,
                "model": model,
                "provider": provider,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "cache_hit": cache_hit,
                "session_key": session_key,
            }
        )
        if len(self._token_buffer) >= BUFFER_SIZE:
            asyncio.create_task(self._flush_buffers())

    def record_log(
        self,
        level: str,
        log_type: str,
        message: str,
        agent_id: str = "",
        session_key: str = "",
        channel: str = "",
        metadata: dict[str, Any] | None = None,
        tool_name: str = "",
    ) -> None:
        self._log_buffer.append(
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "level": level,
                "type": log_type,
                "agent_id": agent_id,
                "session_key": session_key,
                "channel": channel,
                "message": message,
                "metadata": json.dumps(metadata) if metadata else None,
                "tool_name": tool_name,
            }
        )
        if len(self._log_buffer) >= BUFFER_SIZE:
            asyncio.create_task(self._flush_buffers())

    async def query_tokens(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        agent_id: str | None = None,
        model: str | None = None,
    ) -> list[dict[str, Any]]:
        if not self._db:
            return []

        query = "SELECT * FROM token_usage WHERE 1=1"
        params = {}

        if start_date:
            query += " AND timestamp >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query += " AND timestamp <= :end_date"
            params["end_date"] = end_date
        if agent_id:
            query += " AND agent_id = :agent_id"
            params["agent_id"] = agent_id
        if model:
            query += " AND model = :model"
            params["model"] = model

        query += " ORDER BY timestamp DESC"

        async with self._db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def query_logs(
        self,
        log_type: str | None = None,
        agent_id: str | None = None,
        channel: str | None = None,
        level: str | None = None,
        keyword: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], bool]:
        if not self._db:
            return [], False

        query = "SELECT * FROM logs WHERE 1=1"
        params: dict[str, Any] = {}

        if log_type:
            query += " AND type = :type"
            params["type"] = log_type
        if agent_id:
            query += " AND agent_id = :agent_id"
            params["agent_id"] = agent_id
        if channel:
            query += " AND channel = :channel"
            params["channel"] = channel
        if level:
            query += " AND level = :level"
            params["level"] = level
        if keyword:
            query += " AND message LIKE :keyword"
            params["keyword"] = f"%{keyword}%"
        if start_time:
            query += " AND timestamp >= :start_time"
            params["start_time"] = start_time
        if end_time:
            query += " AND timestamp <= :end_time"
            params["end_time"] = end_time

        query += " ORDER BY timestamp DESC LIMIT :limit"
        params["limit"] = limit + 1

        async with self._db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            results = [dict(row) for row in rows]

        has_more = len(results) > limit
        return results[:limit], has_more

    async def close(self) -> None:
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        await self._flush_buffers()

        if self._db:
            await self._db.close()
            self._db = None

        Database._instance = None


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
    metadata: dict[str, Any] | None = None,
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
