"""Database repository for executing queries."""

import aiosqlite
from typing import Any

from nanocats.db.config import (
    TABLE_LOGS,
    TABLE_TOKEN_USAGE,
    INDEX_LOGS_AGENT,
    INDEX_LOGS_TIMESTAMP,
    INDEX_LOGS_TYPE,
    INDEX_TOKEN_AGENT,
    INDEX_TOKEN_TIMESTAMP,
)


class TokenRepository:
    """Repository for token usage queries."""

    def __init__(self, db: aiosqlite.Connection):
        self._db = db

    async def insert_many(self, records: list[dict[str, Any]]) -> None:
        await self._db.executemany(
            f"""INSERT INTO {TABLE_TOKEN_USAGE} 
               (timestamp, agent_id, model, provider, input_tokens, output_tokens, total_tokens, cache_hit, session_key)
               VALUES (:timestamp, :agent_id, :model, :provider, :input_tokens, :output_tokens, :total_tokens, :cache_hit, :session_key)""",
            records,
        )
        await self._db.commit()

    async def query(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        agent_id: str | None = None,
        model: str | None = None,
    ) -> list[dict[str, Any]]:
        query = f"SELECT * FROM {TABLE_TOKEN_USAGE} WHERE 1=1"
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


class LogRepository:
    """Repository for log queries."""

    def __init__(self, db: aiosqlite.Connection):
        self._db = db

    async def insert_many(self, records: list[dict[str, Any]]) -> None:
        await self._db.executemany(
            f"""INSERT INTO {TABLE_LOGS} 
               (timestamp, level, type, agent_id, session_key, channel, message, metadata, tool_name)
               VALUES (:timestamp, :level, :type, :agent_id, :session_key, :channel, :message, :metadata, :tool_name)""",
            records,
        )
        await self._db.commit()

    async def query(
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
        query = f"SELECT * FROM {TABLE_LOGS} WHERE 1=1"
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


async def create_tables(db: aiosqlite.Connection) -> None:
    """Initialize database tables and indexes."""
    await db.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_TOKEN_USAGE} (
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

    await db.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_LOGS} (
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

    await db.execute(
        f"CREATE INDEX IF NOT EXISTS {INDEX_TOKEN_TIMESTAMP} ON {TABLE_TOKEN_USAGE}(timestamp)"
    )
    await db.execute(
        f"CREATE INDEX IF NOT EXISTS {INDEX_TOKEN_AGENT} ON {TABLE_TOKEN_USAGE}(agent_id)"
    )
    await db.execute(
        f"CREATE INDEX IF NOT EXISTS {INDEX_LOGS_TIMESTAMP} ON {TABLE_LOGS}(timestamp)"
    )
    await db.execute(f"CREATE INDEX IF NOT EXISTS {INDEX_LOGS_TYPE} ON {TABLE_LOGS}(type)")
    await db.execute(f"CREATE INDEX IF NOT EXISTS {INDEX_LOGS_AGENT} ON {TABLE_LOGS}(agent_id)")

    await db.commit()
