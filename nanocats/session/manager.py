"""Session management for conversation history."""

import json
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from loguru import logger

from nanocats.config.paths import get_legacy_sessions_dir
from nanocats.utils.helpers import ensure_dir, safe_filename


@dataclass
class Session:
    key: str
    chat_key: str | None = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)
    last_consolidated: int = 0
    message_sources: dict[str, dict] = field(default_factory=dict)

    def _derive_source(self) -> dict:
        if not self.chat_key:
            return {}
        if ":" in self.chat_key:
            channel = self.chat_key.split(":")[0]
        else:
            channel = self.chat_key
        return {
            "channel": channel,
            "chat_key": self.chat_key,
        }

    def add_message(self, role: str, content: str, **kwargs: Any) -> None:
        msg = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            **kwargs,
        }

        # Priority: use pre-injected _source from channel entry point
        existing_source = msg.get("_source")
        if existing_source:
            # Track message_sources from injected _source
            chat_key = existing_source.get("chat_key")
            if chat_key:
                self.message_sources[chat_key] = existing_source
                logger.debug(
                    "Session {}: tracked source chat_key={}, chat_id={}",
                    self.key,
                    chat_key,
                    existing_source.get("chat_id"),
                )
        elif self.chat_key and role != "system":
            # Fallback: derive _source from session's chat_key (for assistant/tool messages)
            msg["_source"] = self._derive_source()

        self.messages.append(msg)
        self.updated_at = datetime.now()

    def get_history(self, max_messages: int = 500) -> list[dict[str, Any]]:
        """Return unconsolidated messages for LLM input, aligned to a user turn."""
        unconsolidated = self.messages[self.last_consolidated :]
        sliced = unconsolidated[-max_messages:]

        # Drop leading non-user messages to avoid orphaned tool_result blocks
        for i, m in enumerate(sliced):
            if m.get("role") == "user":
                sliced = sliced[i:]
                break

        out: list[dict[str, Any]] = []
        for m in sliced:
            entry: dict[str, Any] = {"role": m["role"], "content": m.get("content", "")}
            for k in ("tool_calls", "tool_call_id", "name"):
                if k in m:
                    entry[k] = m[k]
            out.append(entry)
        return out

    def clear(self) -> None:
        self.messages = []
        self.message_sources = {}
        self.last_consolidated = 0
        self.updated_at = datetime.now()


class SessionManager:
    """
    Manages conversation sessions.

    Sessions are stored as JSONL files in the sessions directory.
    """

    def __init__(self, workspace: Path):
        self.workspace = workspace
        self.sessions_dir = ensure_dir(self.workspace / "sessions")
        self.legacy_sessions_dir = get_legacy_sessions_dir()
        self._cache: dict[str, Session] = {}

    def _get_session_path(self, key: str) -> Path:
        """Get the file path for a session."""
        safe_key = safe_filename(key.replace(":", "_"))
        return self.sessions_dir / f"{safe_key}.jsonl"

    def _get_legacy_session_path(self, key: str) -> Path:
        """Legacy global session path (~/.nanocats/sessions/)."""
        safe_key = safe_filename(key.replace(":", "_"))
        return self.legacy_sessions_dir / f"{safe_key}.jsonl"

    def get_or_create(self, key: str, chat_key: str | None = None) -> Session:
        """
        Get an existing session or create a new one.

        Args:
            key: Session key.
            chat_key: Chat key for deriving message source.

        Returns:
            The session.
        """
        if key in self._cache:
            session = self._cache[key]
            if chat_key and not session.chat_key:
                session.chat_key = chat_key
            return session

        session = self._load(key)
        if session is None:
            session = Session(key=key, chat_key=chat_key)

        self._cache[key] = session
        return session

    @staticmethod
    def _legacy_session_key(key: str) -> str | None:
        """Derive legacy session key format (without agent_id) for migration."""
        # user:agent_id:group_id -> user:group_id
        if key.startswith("user:") and key.count(":") == 2:
            parts = key.split(":")
            return f"user:{parts[2]}"
        return None

    def _load(self, key: str) -> Session | None:
        """Load a session from disk."""
        path = self._get_session_path(key)
        if not path.exists():
            # Try migrating from old session key format (user:group -> user:agent_id:group)
            old_key = self._legacy_session_key(key)
            if old_key:
                old_path = self._get_session_path(old_key)
                if old_path.exists():
                    try:
                        shutil.move(str(old_path), str(path))
                        logger.info("Migrated session {} -> {}", old_key, key)
                    except Exception as e:
                        logger.warning("Failed to migrate session {}: {}", old_key, e)

        if not path.exists():
            # Try migrating from legacy global path
            legacy_path = self._get_legacy_session_path(key)
            if legacy_path.exists():
                try:
                    shutil.move(str(legacy_path), str(path))
                    logger.info("Migrated session {} from legacy path", key)
                except Exception:
                    logger.exception("Failed to migrate session {}", key)

        if not path.exists():
            return None

        try:
            messages = []
            metadata = {}
            created_at = None
            last_consolidated = 0
            message_sources = {}

            with open(path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue

                    data = json.loads(line)

                    if data.get("_type") == "metadata":
                        metadata = data.get("metadata", {})
                        created_at = (
                            datetime.fromisoformat(data["created_at"])
                            if data.get("created_at")
                            else None
                        )
                        last_consolidated = data.get("last_consolidated", 0)
                        message_sources = data.get("message_sources", {})
                    else:
                        messages.append(data)

            return Session(
                key=key,
                messages=messages,
                created_at=created_at or datetime.now(),
                metadata=metadata,
                last_consolidated=last_consolidated,
                message_sources=message_sources,
            )
        except Exception as e:
            logger.warning("Failed to load session {}: {}", key, e)
            return None

    def save(self, session: Session) -> None:
        path = self._get_session_path(session.key)

        with open(path, "w", encoding="utf-8") as f:
            metadata_line = {
                "_type": "metadata",
                "key": session.key,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
                "metadata": session.metadata,
                "last_consolidated": session.last_consolidated,
                "message_sources": session.message_sources,
            }
            f.write(json.dumps(metadata_line, ensure_ascii=False) + "\n")
            for msg in session.messages:
                f.write(json.dumps(msg, ensure_ascii=False) + "\n")

        self._cache[session.key] = session

    def invalidate(self, key: str) -> None:
        """Remove a session from the in-memory cache."""
        self._cache.pop(key, None)

    def list_sessions(self) -> list[dict[str, Any]]:
        """
        List all sessions.

        Returns:
            List of session info dicts.
        """
        sessions = []

        for path in self.sessions_dir.glob("*.jsonl"):
            try:
                # Read just the metadata line
                with open(path, encoding="utf-8") as f:
                    first_line = f.readline().strip()
                    if first_line:
                        data = json.loads(first_line)
                        if data.get("_type") == "metadata":
                            key = data.get("key") or path.stem.replace("_", ":", 1)
                            sessions.append(
                                {
                                    "key": key,
                                    "created_at": data.get("created_at"),
                                    "updated_at": data.get("updated_at"),
                                    "path": str(path),
                                }
                            )
            except Exception:
                continue

        return sorted(sessions, key=lambda x: x.get("updated_at", ""), reverse=True)
