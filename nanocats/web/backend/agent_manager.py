"""Agent manager for Web backend - manages AgentLoop instances per agent."""

import asyncio
from pathlib import Path
from typing import Optional

from loguru import logger

from nanocats.agent.loop import AgentLoop
from nanocats.bus.queue import MessageBus
from nanocats.config.loader import load_config, load_agent_config
from nanocats.providers.openai_provider import OpenAIProvider
from nanocats.session.manager import SessionManager


class AgentManager:
    """
    Manages AgentLoop instances for the web interface.
    
    Each agent has its own AgentLoop instance with:
    - Independent workspace and session
    - Shared message bus for the web interface
    """
    
    def __init__(self):
        self._agent_loops: dict[str, AgentLoop] = {}
        self._message_buses: dict[str, MessageBus] = {}
        self._session_managers: dict[str, SessionManager] = {}
        self._locks: dict[str, asyncio.Lock] = {}
    
    def _get_agent_workspace(self, agent_id: str) -> Path:
        """Get workspace path for an agent."""
        # For web interface, use project-local workspace to avoid sandbox restrictions
        project_workspace = Path(__file__).parent.parent.parent.parent / "workspaces" / agent_id
        project_workspace.mkdir(parents=True, exist_ok=True)
        return project_workspace
    
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
            
            # Create AgentLoop
            agent_loop = AgentLoop(
                bus=bus,
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
    
    async def close_agent(self, agent_id: str):
        """Close an agent and cleanup resources."""
        if agent_id in self._agent_loops:
            agent = self._agent_loops[agent_id]
            agent.stop()
            await agent.close_mcp()
            del self._agent_loops[agent_id]
        
        if agent_id in self._message_buses:
            del self._message_buses[agent_id]
        
        if agent_id in self._session_managers:
            del self._session_managers[agent_id]


# Global agent manager instance
agent_manager = AgentManager()
