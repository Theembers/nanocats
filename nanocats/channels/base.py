"""Base channel interface for chat platforms."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING, Any

from loguru import logger

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus

if TYPE_CHECKING:
    from nanocats.agent.registry import AgentRegistry


class BaseChannel(ABC):
    name: str = "base"
    display_name: str = "Base"
    transcription_api_key: str = ""

    def __init__(
        self,
        config: Any,
        bus: MessageBus,
        agent_registry: "AgentRegistry | None" = None,
    ):
        self.config = config
        self.bus = bus
        self.agent_registry = agent_registry
        self._running = False

    async def transcribe_audio(self, file_path: str | Path) -> str:
        """Transcribe an audio file via Groq Whisper. Returns empty string on failure."""
        if not self.transcription_api_key:
            return ""
        try:
            from nanocats.providers.transcription import GroqTranscriptionProvider

            provider = GroqTranscriptionProvider(api_key=self.transcription_api_key)
            return await provider.transcribe(file_path)
        except Exception as e:
            logger.warning("{}: audio transcription failed: {}", self.name, e)
            return ""

    @abstractmethod
    async def start(self) -> None:
        """
        Start the channel and begin listening for messages.

        This should be a long-running async task that:
        1. Connects to the chat platform
        2. Listens for incoming messages
        3. Forwards messages to the bus via _handle_message()
        """
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Stop the channel and clean up resources."""
        pass

    @abstractmethod
    async def send(self, msg: OutboundMessage) -> None:
        """
        Send a message through this channel.

        Args:
            msg: The message to send.
        """
        pass

    def is_allowed(self, sender_id: str) -> bool:
        """Check if *sender_id* is permitted.  Empty list → deny all; ``"*"`` → allow all."""
        allow_list = getattr(self.config, "allow_from", [])
        if not allow_list:
            logger.warning("{}: allow_from is empty — all access denied", self.name)
            return False
        if "*" in allow_list:
            return True
        return str(sender_id) in allow_list

    async def _handle_message(
        self,
        sender_id: str,
        chat_id: str,
        content: str,
        media: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        session_key: str | None = None,
    ) -> None:
        if not self.is_allowed(sender_id):
            logger.warning(
                "Access denied for sender {} on channel {}. "
                "Add them to allowFrom list in config to grant access.",
                sender_id,
                self.name,
            )
            return

        msg = InboundMessage(
            channel=self.name,
            sender_id=str(sender_id),
            chat_id=str(chat_id),
            content=content,
            media=media or [],
            metadata=metadata or {},
            session_key_override=session_key,
        )

        if self.agent_registry:
            await self._resolve_agent_info(msg)

        await self.bus.publish_inbound(msg)

    async def _resolve_agent_info(self, msg: InboundMessage) -> None:
        if not self.agent_registry:
            return

        logger.debug(
            "Resolving agent for channel={}, chat_id={}",
            msg.channel,
            msg.chat_id,
        )

        result = self.agent_registry.find_by_channel(msg.channel, msg.chat_id)
        if result:
            agent, group_id = result
            session_key = self.agent_registry.resolve_session_key(agent, group_id)

            logger.info(
                "Routed to agent={} (type={}), session_key={}, group_id={}",
                agent.id,
                agent.type.value,
                session_key,
                group_id,
            )

            msg.agent_id = agent.id
            msg.agent_type = agent.type.value
            msg._session_key = session_key
            msg.session_group_id = group_id
        else:
            logger.warning(
                "No agent resolved for channel={}, chat_id={}",
                msg.channel,
                msg.chat_id,
            )

    @classmethod
    def default_config(cls) -> dict[str, Any]:
        """Return default config for onboard. Override in plugins to auto-populate config.json."""
        return {"enabled": False}

    @property
    def is_running(self) -> bool:
        """Check if the channel is running."""
        return self._running
