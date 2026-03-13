"""Swarm manager for multi-agent orchestration."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import TYPE_CHECKING, Any

from loguru import logger

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus
from nanocats.config.loader import load_agent_configs
from nanocats.config.schema import AgentInstanceConfig, Config
from nanocats.providers.base import LLMProvider
from nanocats.swarm.channel_manager import ChannelManager
from nanocats.swarm.instance import AgentInstance
from nanocats.swarm.mcp_registry import MCPRegistry
from nanocats.swarm.router import MessageRouter

if TYPE_CHECKING:
    from nanocats.cron.service import CronService


class SwarmManager:
    """
    Manager for Agent Swarm orchestration.

    Responsibilities:
    - Load and manage agent configurations
    - Create and destroy agent instances
    - Route messages to appropriate agents
    - Manage shared resources (MCP registry, channels)
    - Handle agent lifecycle (TTL, auto-start)
    """

    def __init__(
        self,
        config: Config,
        provider: LLMProvider,
        cron_service: CronService | None = None,
    ):
        """
        Initialize the swarm manager.

        Args:
            config: The global nanocats configuration.
            provider: The LLM provider instance.
            cron_service: Optional cron service for scheduled tasks.
        """
        self.config = config
        self.provider = provider
        self.cron_service = cron_service

        # Shared resources
        self.shared_bus = MessageBus()
        self.mcp_registry = MCPRegistry(Path(config.agents.swarm.mcp_registry_path))
        self.channel_manager = ChannelManager(config)

        # Agent management
        self._agents: dict[str, AgentInstance] = {}
        self._channel_routing: dict[str, str] = {}  # "channel:chat_id" -> agent_id
        self._agent_type_index: dict[str, list[str]] = {}  # type -> [agent_ids]

        # Message router
        self.router = MessageRouter(self)

        # State
        self._running = False
        self._startup_task: asyncio.Task | None = None

    @property
    def swarm_config(self):
        """Get swarm configuration."""
        return self.config.agents.swarm

    @property
    def agent_count(self) -> int:
        """Get the number of active agents."""
        return len(self._agents)

    async def start(self) -> None:
        """
        Start the swarm manager.

        This loads all predefined agents and starts them.
        If no agents are configured, creates a default agent.
        """
        if self._running:
            logger.warning("Swarm manager already running")
            return

        logger.info("Starting swarm manager...")

        # Load predefined agent configurations
        agent_configs = load_agent_configs(self.config)
        logger.info("Found {} predefined agent configurations", len(agent_configs))

        # If no agents configured, create default agent
        if not agent_configs:
            logger.info("No agent configs found, creating default agent")
            default_config = self._create_default_agent_config()
            agent_configs = [default_config]

        # Start agents marked for auto-start
        for agent_config in agent_configs:
            if agent_config.auto_start:
                try:
                    await self.create_agent(agent_config)
                except Exception as e:
                    logger.error("Failed to start agent '{}': {}", agent_config.id, e)

        self._running = True
        logger.info("Swarm manager started with {} agents", self.agent_count)

    def _create_default_agent_config(self) -> AgentInstanceConfig:
        """
        Create a default agent config when no agents are configured.

        This mimics the original single-agent mode behavior.
        """
        # Get enabled channels from global config
        enabled_channels = []
        for channel_name in ["telegram", "discord", "feishu", "dingtalk", "slack",
                              "whatsapp", "qq", "email", "matrix", "wecom", "web"]:
            channel_config = getattr(self.config.channels, channel_name, None)
            if channel_config and getattr(channel_config, "enabled", False):
                enabled_channels.append(channel_name)

        return AgentInstanceConfig(
            id="default",
            name="Default Agent",
            type="supervisor",
            model=self.config.agents.defaults.model,
            auto_start=True,
            channels=AgentChannelBindingConfig(
                enabled=enabled_channels,
            ),
            max_tokens=self.config.agents.defaults.max_tokens,
            context_window_tokens=self.config.agents.defaults.context_window_tokens,
            temperature=self.config.agents.defaults.temperature,
            max_tool_iterations=self.config.agents.defaults.max_tool_iterations,
        )

    async def stop(self) -> None:
        """
        Stop the swarm manager and all agents.
        """
        if not self._running:
            return

        logger.info("Stopping swarm manager...")

        # Stop all agents
        agent_ids = list(self._agents.keys())
        for agent_id in agent_ids:
            try:
                await self.destroy_agent(agent_id)
            except Exception as e:
                logger.warning("Error stopping agent '{}': {}", agent_id, e)

        self._running = False
        logger.info("Swarm manager stopped")

    async def create_agent(
        self,
        config: AgentInstanceConfig,
        start_channels: bool = True,
    ) -> AgentInstance:
        """
        Create and start a new agent instance.

        Args:
            config: The agent configuration.
            start_channels: Whether to start channels for this agent.

        Returns:
            The created agent instance.

        Raises:
            ValueError: If max agents limit reached or agent ID already exists.
        """
        # Check limits
        if self.agent_count >= self.swarm_config.max_agents:
            raise ValueError(f"Maximum agent limit ({self.swarm_config.max_agents}) reached")

        if config.id in self._agents:
            raise ValueError(f"Agent '{config.id}' already exists")

        logger.info("Creating agent: {} ({})", config.name or config.id, config.id)

        # Create agent instance
        agent = AgentInstance(
            config=config,
            global_config=self.config,
            provider=self.provider,
            mcp_registry=self.mcp_registry,
            shared_bus=self.shared_bus,
        )

        # Start the agent
        await agent.start()

        # Setup channels if configured
        if start_channels and config.channels.enabled:
            await self._setup_agent_channels(agent)

        # Register routing
        self._register_routing(config)

        # Store agent
        self._agents[config.id] = agent
        self._agent_type_index.setdefault(config.type, []).append(config.id)

        logger.info("Agent '{}' created successfully", config.id)
        return agent

    async def _setup_agent_channels(self, agent: AgentInstance) -> None:
        """Setup channels for an agent."""
        async def handle_message(msg: InboundMessage) -> None:
            """Handle incoming message from agent's channel."""
            await agent.process_message(msg)

        async def send_message(msg: OutboundMessage) -> None:
            """Send outbound message through channel."""
            # Find the appropriate channel and send
            channels = self.channel_manager.get_agent_channels(agent.id)
            for channel in channels:
                if channel.name == msg.channel:
                    await channel.send(msg)
                    return

        await self.channel_manager.setup_agent_channels(
            agent_id=agent.id,
            channel_config=agent.config.channels,
            message_handler=handle_message,
            send_callback=send_message,
        )

    def _register_routing(self, config: AgentInstanceConfig) -> None:
        """Register routing rules for an agent."""
        for channel, chat_ids in config.routing.items():
            for chat_id in chat_ids:
                key = f"{channel}:{chat_id}"
                self._channel_routing[key] = config.id
                logger.debug("Routing {} -> {}", key, config.id)

    def _unregister_routing(self, agent_id: str) -> None:
        """Unregister all routing rules for an agent."""
        keys_to_remove = [
            k for k, v in self._channel_routing.items()
            if v == agent_id
        ]
        for key in keys_to_remove:
            del self._channel_routing[key]

    async def destroy_agent(self, agent_id: str) -> bool:
        """
        Destroy an agent instance.

        Args:
            agent_id: The agent identifier.

        Returns:
            True if destroyed, False if not found.
        """
        agent = self._agents.pop(agent_id, None)
        if not agent:
            return False

        logger.info("Destroying agent: {}", agent_id)

        # Teardown channels
        await self.channel_manager.teardown_agent_channels(agent_id)

        # Stop the agent
        await agent.stop()

        # Unregister routing
        self._unregister_routing(agent_id)

        # Update type index
        if agent.config.type in self._agent_type_index:
            try:
                self._agent_type_index[agent.config.type].remove(agent_id)
            except ValueError:
                pass

        logger.info("Agent '{}' destroyed", agent_id)
        return True

    def get_agent(self, agent_id: str) -> AgentInstance | None:
        """
        Get an agent by ID.

        Args:
            agent_id: The agent identifier.

        Returns:
            The agent instance or None if not found.
        """
        return self._agents.get(agent_id)

    def get_agents_by_type(self, agent_type: str) -> list[AgentInstance]:
        """
        Get all agents of a specific type.

        Args:
            agent_type: The agent type (supervisor, user, specialized, task).

        Returns:
            List of agent instances.
        """
        agent_ids = self._agent_type_index.get(agent_type, [])
        return [self._agents[aid] for aid in agent_ids if aid in self._agents]

    def get_supervisor(self) -> AgentInstance | None:
        """Get the supervisor agent, if any."""
        agents = self.get_agents_by_type("supervisor")
        return agents[0] if agents else None

    def route_message(self, msg: InboundMessage) -> AgentInstance | None:
        """
        Route a message to the appropriate agent.

        Args:
            msg: The inbound message.

        Returns:
            The target agent instance or None.
        """
        return self.router.route(msg)

    def get_agent_for_route(self, channel: str, chat_id: str) -> AgentInstance | None:
        """
        Get the agent for a specific route.

        Args:
            channel: The channel type.
            chat_id: The chat identifier.

        Returns:
            The agent instance or None.
        """
        key = f"{channel}:{chat_id}"
        agent_id = self._channel_routing.get(key)
        if agent_id:
            return self._agents.get(agent_id)

        # Try channel-level routing (any chat_id on this channel)
        key = f"{channel}:*"
        agent_id = self._channel_routing.get(key)
        if agent_id:
            return self._agents.get(agent_id)

        return None

    def list_agents(self) -> list[dict[str, Any]]:
        """
        List all agents with their status.

        Returns:
            List of agent status dictionaries.
        """
        result = []
        for agent in self._agents.values():
            result.append({
                "id": agent.id,
                "name": agent.name,
                "type": agent.config.type,
                "running": agent.is_running,
                "workspace": str(agent.workspace),
                "channels": agent.config.channels.enabled,
            })
        return result

    async def dispatch_to_agent(
        self,
        agent_id: str,
        content: str,
        channel: str = "system",
        chat_id: str | None = None,
    ) -> str:
        """
        Dispatch a message to a specific agent.

        Args:
            agent_id: Target agent ID.
            content: Message content.
            channel: Source channel.
            chat_id: Chat ID (defaults to agent_id).

        Returns:
            The agent's response.
        """
        agent = self.get_agent(agent_id)
        if not agent:
            return f"Agent '{agent_id}' not found"

        msg = InboundMessage(
            channel=channel,
            sender_id="system",
            chat_id=chat_id or agent_id,
            content=content,
        )

        response = await agent.process_message(msg)
        return response.content if response else ""
