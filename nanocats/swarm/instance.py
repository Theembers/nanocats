"""Agent instance for swarm mode."""

from __future__ import annotations

import asyncio
from contextlib import AsyncExitStack
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable

from loguru import logger

from nanocats.agent.context import ContextBuilder
from nanocats.agent.loop import AgentLoop
from nanocats.agent.tools.registry import ToolRegistry
from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus
from nanocats.config.schema import AgentInstanceConfig, Config
from nanocats.session.manager import SessionManager
from nanocats.swarm.config import AgentConfigLoader
from nanocats.swarm.mcp_registry import MCPRegistry

if TYPE_CHECKING:
    from nanocats.providers.base import LLMProvider


class AgentInstance:
    """
    An independent agent instance.

    Each agent has its own:
    - Workspace and memory
    - Tool registry and MCP connections
    - Session manager
    - Message bus (internal)
    - Agent loop
    """

    def __init__(
        self,
        config: AgentInstanceConfig,
        global_config: Config,
        provider: LLMProvider,
        mcp_registry: MCPRegistry,
        shared_bus: MessageBus | None = None,
    ):
        """
        Initialize an agent instance.

        Args:
            config: The agent-specific configuration.
            global_config: The global nanocats configuration.
            provider: The LLM provider instance.
            mcp_registry: The MCP registry for server configurations.
            shared_bus: Optional shared message bus for inter-agent communication.
        """
        # Resolve config with defaults
        self.config_loader = AgentConfigLoader(global_config)
        self.config = self.config_loader.resolve_config(config)
        self.global_config = global_config
        self.provider = provider
        self.mcp_registry = mcp_registry

        # Workspace
        self.workspace = self.config.workspace_path

        # Internal message bus for this agent
        self.agent_bus = MessageBus()

        # Shared bus for inter-agent communication (optional)
        self.shared_bus = shared_bus

        # Core components (initialized on start)
        self.context: ContextBuilder | None = None
        self.sessions: SessionManager | None = None
        self.tools: ToolRegistry | None = None
        self.loop: AgentLoop | None = None

        # MCP connection management
        self._mcp_stack: AsyncExitStack | None = None
        self._mcp_servers: dict[str, Any] = {}
        self._mcp_connected = False

        # State
        self._started = False
        self._running = False

        # Channel bindings (set by ChannelManager)
        self._bound_channels: list[Any] = []

    @property
    def id(self) -> str:
        """Get the agent ID."""
        return self.config.id

    @property
    def name(self) -> str:
        """Get the agent display name."""
        return self.config.name or self.config.id

    @property
    def is_running(self) -> bool:
        """Check if the agent is running."""
        return self._running

    async def start(self) -> None:
        """
        Start the agent instance.

        This initializes the workspace, connects MCP servers, and starts the agent loop.
        """
        if self._started:
            logger.warning("Agent '{}' already started", self.id)
            return

        logger.info("Starting agent: {} ({})", self.name, self.id)

        # Setup workspace
        self.config_loader.setup_workspace(self.config)

        # Initialize components
        self.context = ContextBuilder(self.workspace)
        self.sessions = SessionManager(self.workspace)
        self.tools = ToolRegistry()

        # Prepare MCP configuration
        self._mcp_servers = self.mcp_registry.create_agent_mcp_config(
            enabled_servers=self.config.mcp.enabled_servers,
            custom_servers=self.config.mcp.custom_servers,
        )

        # Create agent loop
        self.loop = AgentLoop(
            bus=self.agent_bus,
            provider=self.provider,
            workspace=self.workspace,
            model=self.config.model,
            max_iterations=self.config.max_tool_iterations or 40,
            context_window_tokens=self.config.context_window_tokens or 65_536,
            brave_api_key=self.global_config.tools.web.search.api_key,
            web_proxy=self.global_config.tools.web.proxy,
            exec_config=self.global_config.tools.exec,
            restrict_to_workspace=self.global_config.tools.restrict_to_workspace,
            session_manager=self.sessions,
            mcp_servers=self._mcp_servers,
            channels_config=self.global_config.channels,
        )

        self._started = True
        logger.info("Agent '{}' started successfully", self.id)

    async def stop(self) -> None:
        """
        Stop the agent instance.

        This closes MCP connections and cleans up resources.
        """
        if not self._started:
            return

        logger.info("Stopping agent: {}", self.id)

        # Stop the loop if running
        if self.loop:
            self.loop.stop()

        # Close MCP connections
        await self._close_mcp()

        # Teardown channels
        for channel in self._bound_channels:
            try:
                await channel.stop()
            except Exception as e:
                logger.warning("Error stopping channel for agent '{}': {}", self.id, e)

        self._started = False
        self._running = False
        logger.info("Agent '{}' stopped", self.id)

    async def _close_mcp(self) -> None:
        """Close MCP connections."""
        if self._mcp_stack:
            try:
                await self._mcp_stack.aclose()
            except (RuntimeError, BaseExceptionGroup):
                pass  # MCP SDK cleanup can be noisy
            self._mcp_stack = None
            self._mcp_connected = False

    async def process_message(self, msg: InboundMessage) -> OutboundMessage | None:
        """
        Process an incoming message.

        Args:
            msg: The inbound message to process.

        Returns:
            The outbound response, or None if no response.
        """
        if not self._started or not self.loop:
            logger.warning("Agent '{}' not started, cannot process message", self.id)
            return None

        return await self.loop._process_message(msg)

    def bind_channel(self, channel: Any) -> None:
        """
        Bind a communication channel to this agent.

        Args:
            channel: The channel instance to bind.
        """
        channel.bind_agent(self.id)
        self._bound_channels.append(channel)
        logger.debug("Bound channel to agent '{}': {}", self.id, channel.name if hasattr(channel, 'name') else type(channel).__name__)

    def get_routing_keys(self) -> list[str]:
        """
        Get all routing keys for this agent.

        Returns:
            List of routing keys in format "channel:chat_id".
        """
        keys = []
        for channel, chat_ids in self.config.routing.items():
            for chat_id in chat_ids:
                keys.append(f"{channel}:{chat_id}")
        return keys

    def __repr__(self) -> str:
        return f"AgentInstance(id={self.id!r}, name={self.name!r}, type={self.config.type})"
