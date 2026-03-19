"""Event types for the message bus."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class InboundMessage:
    channel: str
    sender_id: str
    chat_id: str
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    media: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    session_key_override: str | None = None

    agent_id: str | None = None
    agent_type: str | None = None
    session_group_id: str | None = None
    chat_key: str | None = None

    # Source info injected at channel entry point
    _source: dict[str, Any] | None = field(default=None, repr=False)
    _session_key: str | None = field(default=None, repr=False)

    def __post_init__(self):
        if self.session_key_override:
            self._session_key = self.session_key_override

    @property
    def session_key(self) -> str:
        if self._session_key:
            return self._session_key
        return f"{self.channel}:{self.chat_id}"

    def to_session_message(self) -> dict:
        # Prefer pre-injected _source from channel entry point
        if self._source:
            source_info = self._source.copy()
            # Ensure chat_id and sender_id are included
            source_info.setdefault("chat_id", self.chat_id)
            source_info.setdefault("sender_id", self.sender_id)
        else:
            # Fallback: derive from available fields
            chat_key = self.chat_key
            if chat_key and ":" in chat_key:
                source_channel = chat_key.split(":")[0]
            else:
                source_channel = self.channel
            source_info = {
                "channel": source_channel,
                "chat_id": self.chat_id,
                "sender_id": self.sender_id,
                "chat_key": chat_key,
            }
        return {
            "role": "user",
            "content": self.content,
            "_source": source_info,
        }


@dataclass
class OutboundMessage:
    """Message to send to a chat channel."""

    channel: str
    chat_id: str
    content: str
    reply_to: str | None = None
    media: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
