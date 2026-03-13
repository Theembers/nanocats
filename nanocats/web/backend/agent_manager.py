"""Agent manager for Web backend - manages AgentLoop instances per agent."""

import asyncio
from pathlib import Path
from typing import Any, Optional

from loguru import logger

from nanocats.agent.loop import AgentLoop
from nanocats.bus.queue import MessageBus
from nanocats.channels.web import WebChannel, WebChannelConfig
from nanocats.config.loader import load_config, load_agent_config
from nanocats.providers.openai_provider import OpenAIProvider
from nanocats.session.manager import SessionManager
from nanocats.swarm.channel_bus import AgentChannelBus


class AgentManager:
    """
    Manages AgentLoop instances for the web interface.
    
    Each agent has its own AgentLoop instance with:
    - Independent workspace and session
    - WebChannel for WebSocket communication
    - AgentChannelBus for direct message routing (bypassing async queue)
    """

    def __init__(self):
        self._agent_loops: dict[str, AgentLoop] = {}
        self._message_buses: dict[str, MessageBus] = {}
        self._session_managers: dict[str, SessionManager] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._web_channels: dict[str, WebChannel] = {}  # WebChannel per agent
    
    def _get_agent_workspace(self, agent_id: str) -> Path:
        """Get workspace path for an agent."""
        # Use standard agent workspace path: ~/.nanocats/workspaces/{agent_id}
        from nanocats.config.paths import get_workspace_path
        workspace = get_workspace_path(f"~/.nanocats/workspaces/{agent_id}")
        return workspace
    
    def _create_provider(self, agent_id: str):
        """Create LLM provider for an agent."""
        import os
        
        from nanocats.providers.registry import find_by_model
        
        config = load_config()
        agent_config = load_agent_config(agent_id, config)
        
        # Get model
        model = agent_config.model if agent_config and hasattr(agent_config, 'model') else None
        if not model:
            model = config.agents.defaults.model
        
        # Find provider spec to get the correct env_key and api_base
        spec = find_by_model(model)
        
        # Get API key and api_base from config based on provider
        api_key = None
        api_base = None
        provider_name = None
        if spec:
            provider_name = spec.name
            if hasattr(config.providers, provider_name):
                provider_config = getattr(config.providers, provider_name)
                api_key = provider_config.api_key if hasattr(provider_config, 'api_key') else None
                api_base = provider_config.api_base if hasattr(provider_config, 'api_base') else None
                logger.info(f"Provider {provider_name}: api_key={'***' if api_key else 'None'}, api_base={api_base}")
        
        # Use spec's default_api_base if not configured
        if not api_base and spec and spec.default_api_base:
            api_base = spec.default_api_base
            logger.info(f"Using default api_base for {spec.name}: {api_base}")
        
        # Use OpenAIProvider directly for better compatibility (especially for MiniMax cache info)
        return OpenAIProvider(
            api_key=api_key,
            api_base=api_base,
            default_model=model,
        )
    
    async def get_or_create_agent(self, agent_id: str) -> AgentLoop:
        """Get or create an AgentLoop for the given agent ID."""
        if agent_id in self._agent_loops:
            return self._agent_loops[agent_id]
        
        # Create lock for this agent
        if agent_id not in self._locks:
            self._locks[agent_id] = asyncio.Lock()
        
        async with self._locks[agent_id]:
            # Double-check after acquiring lock
            if agent_id in self._agent_loops:
                return self._agent_loops[agent_id]
            
            # Load config
            config = load_config()
            agent_config = load_agent_config(agent_id, config)
            
            # Get workspace
            workspace = self._get_agent_workspace(agent_id)
            
            # Create message bus
            bus = MessageBus()
            self._message_buses[agent_id] = bus
            
            # Create session manager
            session_manager = SessionManager(workspace)
            self._session_managers[agent_id] = session_manager
            
            # Create provider
            provider = self._create_provider(agent_id)
            
            # Get model and other settings
            model = agent_config.model if agent_config and hasattr(agent_config, 'model') else None
            if not model:
                model = config.agents.defaults.model
            
            max_iterations = (agent_config.max_tool_iterations 
                            if agent_config and hasattr(agent_config, 'max_tool_iterations') 
                            else config.agents.defaults.max_tool_iterations)
            
            context_window_tokens = (agent_config.context_window_tokens 
                                   if agent_config and hasattr(agent_config, 'context_window_tokens') 
                                   else config.agents.defaults.context_window_tokens)
            
            # Get MCP servers
            mcp_servers = config.tools.mcp_servers if hasattr(config.tools, 'mcp_servers') else {}

            # Create a temporary bus first (will be replaced with AgentChannelBus)
            temp_bus = MessageBus()

            # Create AgentLoop first (needed for the handler closure)
            agent_loop = AgentLoop(
                bus=temp_bus,
                provider=provider,
                workspace=workspace,
                model=model,
                max_iterations=max_iterations or 40,
                context_window_tokens=context_window_tokens or 65536,
                brave_api_key=config.tools.web.search.api_key or None,
                web_proxy=config.tools.web.proxy or None,
                exec_config=config.tools.exec,
                restrict_to_workspace=config.tools.restrict_to_workspace,
                session_manager=session_manager,
                mcp_servers=mcp_servers,
                channels_config=config.channels,
                agent_id=agent_id,
            )

            # Create AgentChannelBus for direct routing (bypasses async queue)
            # Must be created AFTER agent_loop to avoid UnboundLocalError
            async def message_handler(msg):
                """Handle inbound message by processing through agent loop."""
                return await agent_loop._process_message(msg)

            async def send_callback(msg):
                """Handle outbound message by sending through WebChannel."""
                web_ch = self._web_channels.get(agent_id)
                if web_ch:
                    await web_ch.send(msg)

            channel_bus = AgentChannelBus(message_handler, send_callback)

            # Replace the agent loop's bus with our channel bus
            agent_loop.bus = channel_bus

            # Create WebChannel for this agent
            web_config = WebChannelConfig(
                enabled=True,
                allow_from=getattr(config.channels.web, 'allow_from', ["*"]),
                heartbeat_interval=getattr(config.channels.web, 'heartbeat_interval', 30),
                max_connections=getattr(config.channels.web, 'max_connections', 100),
            )
            web_channel = WebChannel(web_config, channel_bus)
            self._web_channels[agent_id] = web_channel

            self._agent_loops[agent_id] = agent_loop

            return agent_loop
    
    async def process_message(
        self, 
        agent_id: str, 
        content: str,
        on_progress: Optional[callable] = None
    ) -> str:
        """
        Process a message through the agent.
        
        Args:
            agent_id: The agent ID
            content: Message content
            on_progress: Optional callback for progress updates
            
        Returns:
            The agent's response
        """
        agent = await self.get_or_create_agent(agent_id)
        
        # Use web session for this agent
        session_key = f"web:{agent_id}"
        
        # Process the message
        response = await agent.process_direct(
            content=content,
            session_key=session_key,
            channel="web",
            chat_id=agent_id,
            on_progress=on_progress
        )
        
        return response
    
    def get_session_manager(self, agent_id: str) -> SessionManager:
        """Get the session manager for an agent."""
        if agent_id not in self._session_managers:
            workspace = self._get_agent_workspace(agent_id)
            self._session_managers[agent_id] = SessionManager(workspace)
        return self._session_managers[agent_id]

    async def get_or_create_web_channel(self, agent_id: str) -> WebChannel:
        """
        Get or create a WebChannel for the given agent.

        This allows WebSocket handlers to use the WebChannel for message processing,
        enabling unified message flow through WebChannel -> AgentChannelBus -> AgentLoop.
        """
        # Ensure agent exists (this will create it if not exists)
        await self.get_or_create_agent(agent_id)
        return self._web_channels.get(agent_id)

    async def close_agent(self, agent_id: str):
        """Close an agent and cleanup resources."""
        if agent_id in self._agent_loops:
            agent = self._agent_loops[agent_id]
            agent.stop()
            await agent.close_mcp()
            del self._agent_loops[agent_id]

        # Stop WebChannel
        if agent_id in self._web_channels:
            web_channel = self._web_channels[agent_id]
            await web_channel.stop()
            del self._web_channels[agent_id]

        if agent_id in self._message_buses:
            del self._message_buses[agent_id]
        
        if agent_id in self._session_managers:
            del self._session_managers[agent_id]


# Global agent manager instance
agent_manager = AgentManager()
