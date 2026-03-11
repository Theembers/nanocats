"""Base channel interface for chat platforms."""

from abc import ABC, abstractmethod
from typing import Any, Awaitable, Callable

from loguru import logger

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus


class BaseChannel(ABC):
    """
    Abstract base class for chat channel implementations.

    Each channel (Telegram, Discord, etc.) should implement this interface
    to integrate with the nanocats message bus.
    """

    name: str = "base"

    def __init__(self, config: Any, bus: MessageBus):
        """
        Initialize the channel.

        Args:
            config: Channel-specific configuration.
            bus: The message bus for communication.
        """
        self.config = config
        self.bus = bus
        self._running = False
        # Agent binding support (for swarm mode)
        self._bound_agent_id: str | None = None
        self._message_handler: Callable[[InboundMessage], Awaitable[None]] | None = None

    def bind_agent(self, agent_id: str) -> None:
        """
        Bind this channel to a specific agent.

        In swarm mode, channels are bound to agents for message routing.

        Args:
            agent_id: The agent identifier to bind to.
        """
        self._bound_agent_id = agent_id

    def set_message_handler(
        self,
        handler: Callable[[InboundMessage], Awaitable[None]]
    ) -> None:
        """
        Set a custom message handler.

        When set, incoming messages will be routed to this handler
        instead of the bus directly.

        Args:
            handler: Async callback for handling inbound messages.
        """
        self._message_handler = handler

    @property
    def bound_agent(self) -> str | None:
        """Get the bound agent ID, if any."""
        return self._bound_agent_id

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
        """
        Handle an incoming message from the chat platform.

        This method checks permissions and forwards to the bus or custom handler.

        Args:
            sender_id: The sender's identifier.
            chat_id: The chat/channel identifier.
            content: Message text content.
            media: Optional list of media URLs.
            metadata: Optional channel-specific metadata.
            session_key: Optional session key override (e.g. thread-scoped sessions).
        """
        if not self.is_allowed(sender_id):
            logger.warning(
                "Access denied for sender {} on channel {}. "
                "Add them to allowFrom list in config to grant access.",
                sender_id, self.name,
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

        # Route to custom handler if set (swarm mode)
        if self._message_handler:
            await self._message_handler(msg)
        else:
            await self.bus.publish_inbound(msg)

    @property
    def is_running(self) -> bool:
        """Check if the channel is running."""
        return self._running
