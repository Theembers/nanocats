"""Async message queue for decoupled channel-agent communication."""

import asyncio

from loguru import logger

from nanocats.bus.events import InboundMessage, OutboundMessage


class MessageBus:
    """
    Async message bus that decouples chat channels from the agent core.

    Channels push messages to per-agent inbound queues, and agents process
    them and push responses to the outbound queue.
    """

    def __init__(self):
        self._inbound: dict[str, asyncio.Queue[InboundMessage]] = {}
        self.outbound: asyncio.Queue[OutboundMessage] = asyncio.Queue()

    def register_agent(self, agent_id: str) -> None:
        """Register an agent-specific inbound queue."""
        if agent_id not in self._inbound:
            self._inbound[agent_id] = asyncio.Queue()

    async def publish_inbound(self, msg: InboundMessage) -> None:
        """Publish a message from a channel to the target agent."""
        agent_id = msg.agent_id
        if agent_id and agent_id in self._inbound:
            await self._inbound[agent_id].put(msg)
        else:
            logger.warning("No inbound queue for agent_id={}, message dropped", agent_id)

    async def consume_inbound(self, agent_id: str) -> InboundMessage:
        """Consume the next inbound message for the given agent (blocks until available)."""
        if agent_id not in self._inbound:
            self._inbound[agent_id] = asyncio.Queue()
        return await self._inbound[agent_id].get()

    async def publish_outbound(self, msg: OutboundMessage) -> None:
        """Publish a response from the agent to channels."""
        await self.outbound.put(msg)

    async def consume_outbound(self) -> OutboundMessage:
        """Consume the next outbound message (blocks until available)."""
        return await self.outbound.get()

    @property
    def inbound_size(self) -> int:
        """Number of pending inbound messages across all agents."""
        return sum(q.qsize() for q in self._inbound.values())

    @property
    def outbound_size(self) -> int:
        """Number of pending outbound messages."""
        return self.outbound.qsize()
