"""Web channel for browser-based chat interface using WebSocket."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus
from nanocats.channels.base import BaseChannel


class WebChannelConfig:
    """Web channel configuration."""

    def __init__(
        self,
        enabled: bool = True,
        allow_from: list[str] | None = None,
        heartbeat_interval: int = 30,
        max_connections: int = 100,
    ):
        self.enabled = enabled
        self.allow_from = allow_from or ["*"]
        self.heartbeat_interval = heartbeat_interval
        self.max_connections = max_connections


class WebChannel(BaseChannel):
    """Web channel for browser-based chat interface via WebSocket."""

    name = "web"

    def __init__(self, config: WebChannelConfig, bus: MessageBus):
        """
        Initialize the Web channel.

        Args:
            config: Web channel configuration.
            bus: The message bus for communication.
        """
        super().__init__(config, bus)
        self.config: WebChannelConfig = config
        # WebSocket connections: chat_id -> websocket
        self._connections: dict[str, Any] = {}
        # User mapping: websocket -> user_id
        self._user_map: dict[Any, str] = {}
        self._running = False

    async def start(self) -> None:
        """Start the web channel message handler."""
        self._running = True
        logger.info("WebChannel started")

    async def stop(self) -> None:
        """Stop the web channel."""
        self._running = False
        # Close all WebSocket connections
        for ws in list(self._connections.values()):
            try:
                await ws.close()
            except Exception as e:
                logger.warning("Error closing WebSocket: {}", e)
        self._connections.clear()
        self._user_map.clear()
        logger.info("WebChannel stopped")

    async def send(self, msg: OutboundMessage) -> None:
        """
        Send message to the appropriate WebSocket connection.

        Args:
            msg: The outbound message to send.
        """
        ws = self._connections.get(msg.chat_id)
        if ws:
            try:
                await ws.send_json({
                    "type": "message",
                    "content": msg.content,
                    "metadata": msg.metadata,
                })
            except Exception as e:
                logger.error("Error sending WebSocket message: {}", e)
        else:
            logger.debug("No WebSocket connection for chat_id: {}", msg.chat_id)

    def register_connection(
        self,
        chat_id: str,
        websocket: Any,
        user_id: str | None = None,
    ) -> None:
        """
        Register a WebSocket connection.

        Args:
            chat_id: The chat/session identifier.
            websocket: The WebSocket connection.
            user_id: Optional user identifier.
        """
        self._connections[chat_id] = websocket
        if user_id:
            self._user_map[websocket] = user_id

    def unregister_connection(self, chat_id: str) -> None:
        """
        Unregister a WebSocket connection.

        Args:
            chat_id: The chat/session identifier.
        """
        ws = self._connections.pop(chat_id, None)
        if ws:
            self._user_map.pop(ws, None)

    async def handle_websocket_message(
        self,
        user_id: str,
        chat_id: str,
        content: str,
        websocket: Any,
    ) -> None:
        """
        Handle incoming WebSocket message.

        Args:
            user_id: The user identifier.
            chat_id: The chat/session identifier.
            content: Message content.
            websocket: The WebSocket connection (for response routing).
        """
        # Register connection for responses
        self.register_connection(chat_id, websocket, user_id)

        # Process through the standard message handler
        await self._handle_message(
            sender_id=user_id,
            chat_id=chat_id,
            content=content,
        )

    async def broadcast_to_channel(
        self,
        channel_filter: str,
        message: OutboundMessage,
    ) -> None:
        """
        Broadcast a message to all connections in a channel.

        Args:
            channel_filter: Channel prefix to filter connections.
            message: The message to broadcast.
        """
        for chat_id, ws in list(self._connections.items()):
            if chat_id.startswith(channel_filter):
                try:
                    await ws.send_json({
                        "type": "message",
                        "content": message.content,
                        "metadata": message.metadata,
                    })
                except Exception as e:
                    logger.error("Error broadcasting to {}: {}", chat_id, e)

    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self._connections)

    def isConnected(self, chat_id: str) -> bool:
        """Check if a chat session has an active connection."""
        return chat_id in self._connections
