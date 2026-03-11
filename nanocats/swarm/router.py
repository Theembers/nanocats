"""Message router for swarm mode."""

from __future__ import annotations

from typing import TYPE_CHECKING

from loguru import logger

from nanocats.bus.events import InboundMessage

if TYPE_CHECKING:
    from nanocats.swarm.instance import AgentInstance
    from nanocats.swarm.manager import SwarmManager


class MessageRouter:
    """
    Routes messages to appropriate agents in swarm mode.

    Routing strategy:
    1. Exact match: "channel:chat_id" -> agent
    2. Channel wildcard: "channel:*" -> agent
    3. Agent type routing: based on message metadata
    4. Fallback: supervisor or default agent
    """

    def __init__(self, swarm: SwarmManager):
        """
        Initialize the message router.

        Args:
            swarm: The swarm manager instance.
        """
        self.swarm = swarm

    def route(self, msg: InboundMessage) -> AgentInstance | None:
        """
        Route a message to the appropriate agent.

        Args:
            msg: The inbound message.

        Returns:
            The target agent instance or None.
        """
        # 1. Try exact route match
        agent = self._route_exact(msg)
        if agent:
            logger.debug("Routed message via exact match to agent '{}'", agent.id)
            return agent

        # 2. Try channel-level routing
        agent = self._route_by_channel(msg)
        if agent:
            logger.debug("Routed message via channel match to agent '{}'", agent.id)
            return agent

        # 3. Try metadata-based routing
        agent = self._route_by_metadata(msg)
        if agent:
            logger.debug("Routed message via metadata to agent '{}'", agent.id)
            return agent

        # 4. Fallback to supervisor
        agent = self._get_fallback_agent()
        if agent:
            logger.debug("Routed message via fallback to agent '{}'", agent.id)
            return agent

        logger.warning("No agent found for message from {}:{}", msg.channel, msg.chat_id)
        return None

    def _route_exact(self, msg: InboundMessage) -> AgentInstance | None:
        """Try exact route match."""
        return self.swarm.get_agent_for_route(msg.channel, msg.chat_id)

    def _route_by_channel(self, msg: InboundMessage) -> AgentInstance | None:
        """Try channel-level routing."""
        return self.swarm.get_agent_for_route(msg.channel, "*")

    def _route_by_metadata(self, msg: InboundMessage) -> AgentInstance | None:
        """Route based on message metadata."""
        metadata = msg.metadata or {}

        # Check for explicit agent routing in metadata
        target_agent = metadata.get("_target_agent")
        if target_agent:
            return self.swarm.get_agent(target_agent)

        # Check for user-based routing (map sender to agent)
        sender_id = msg.sender_id
        if sender_id:
            # Look for agents that have this sender in their allow list
            for agent in self.swarm._agents.values():
                if self._check_sender_allowed(agent, sender_id, msg.channel):
                    return agent

        return None

    def _check_sender_allowed(
        self,
        agent: AgentInstance,
        sender_id: str,
        channel: str,
    ) -> bool:
        """Check if sender is allowed for an agent's channel."""
        channel_configs = agent.config.channels.configs.get(channel, {})
        allow_list = channel_configs.get("allow_from", [])
        return sender_id in allow_list or "*" in allow_list

    def _get_fallback_agent(self) -> AgentInstance | None:
        """Get the fallback agent (supervisor or first available)."""
        # Try supervisor first
        supervisor = self.swarm.get_supervisor()
        if supervisor:
            return supervisor

        # Fall back to first user agent
        user_agents = self.swarm.get_agents_by_type("user")
        if user_agents:
            return user_agents[0]

        # Last resort: any agent
        agents = list(self.swarm._agents.values())
        return agents[0] if agents else None

    def get_routes_for_agent(self, agent_id: str) -> list[str]:
        """
        Get all routes for a specific agent.

        Args:
            agent_id: The agent identifier.

        Returns:
            List of route keys.
        """
        routes = []
        for key, aid in self.swarm._channel_routing.items():
            if aid == agent_id:
                routes.append(key)
        return routes
