"""Swarm module for multi-agent orchestration."""

from nanocats.swarm.manager import SwarmManager
from nanocats.swarm.instance import AgentInstance
from nanocats.swarm.config import AgentConfigLoader
from nanocats.swarm.mcp_registry import MCPRegistry
from nanocats.swarm.channel_manager import ChannelManager
from nanocats.swarm.router import MessageRouter

__all__ = [
    "SwarmManager",
    "AgentInstance",
    "AgentConfigLoader",
    "MCPRegistry",
    "ChannelManager",
    "MessageRouter",
]
