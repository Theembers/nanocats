"""Main Database class with buffered writes and query methods."""

import asyncio
import json
from datetime import datetime
from typing import Any

import aiosqlite
from loguru import logger

from nanocats.db.config import BUFFER_SIZE, DB_PATH, DATA_DIR, FLUSH_INTERVAL
from nanocats.db.repository import LogRepository, TokenRepository, create_tables


class Database:
    _instance = None
    _lock = asyncio.Lock()

    def __init__(self):
        self._db: aiosqlite.Connection | None = None
        self._token_buffer: list[dict[str, Any]] = []
        self._log_buffer: list[dict[str, Any]] = []
        self._flush_task: asyncio.Task | None = None
        self._token_repo: TokenRepository | None = None
        self._log_repo: LogRepository | None = None

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

        await create_tables(self._db)

        self._token_repo = TokenRepository(self._db)
        self._log_repo = LogRepository(self._db)

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
                if self._token_repo:
                    await self._token_repo.insert_many(tokens_to_write)

            if self._log_buffer:
                logs_to_write = self._log_buffer.copy()
                self._log_buffer.clear()
                if self._log_repo:
                    await self._log_repo.insert_many(logs_to_write)

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
        if not self._token_repo:
            return []
        return await self._token_repo.query(
            start_date=start_date,
            end_date=end_date,
            agent_id=agent_id,
            model=model,
        )

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
        if not self._log_repo:
            return [], False
        return await self._log_repo.query(
            log_type=log_type,
            agent_id=agent_id,
            channel=channel,
            level=level,
            keyword=keyword,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
        )

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
