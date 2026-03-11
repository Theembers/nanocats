"""Message bus module for decoupled channel-agent communication."""

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus

__all__ = ["MessageBus", "InboundMessage", "OutboundMessage"]
