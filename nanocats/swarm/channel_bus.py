"""Channel bus wrapper for agent-specific message routing."""

from typing import Any, Awaitable, Callable

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus


class AgentChannelBus(MessageBus):
    """
    A message bus wrapper that routes channel messages to a specific agent.

    This allows each agent to have its own message handling while
    sharing the same channel infrastructure.
    """

    def __init__(
        self,
        message_handler: Callable[[InboundMessage], Awaitable[None]],
        send_callback: Callable[[OutboundMessage], Awaitable[None]],
    ):
        """
        Initialize the agent channel bus.

        Args:
            message_handler: Callback for handling inbound messages.
            send_callback: Callback for sending outbound messages.
        """
        super().__init__()
        self._message_handler = message_handler
        self._send_callback = send_callback

    async def publish_inbound(self, msg: InboundMessage) -> None:
        """
        Publish an inbound message to the agent's handler.

        Args:
            msg: The inbound message.
        """
        await self._message_handler(msg)

    async def publish_outbound(self, msg: OutboundMessage) -> None:
        """
        Publish an outbound message through the send callback.

        Args:
            msg: The outbound message.
        """
        await self._send_callback(msg)
