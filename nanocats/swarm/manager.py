"""Swarm manager for multi-agent orchestration."""

import asyncio
from pathlib import Path

from loguru import logger

from nanocats.agent.loop import AgentLoop
from nanocats.agent.registry import AgentRegistry
from nanocats.bus.queue import MessageBus
from nanocats.config.schema import AgentConfig
from nanocats.cron.service import CronService
from nanocats.providers.base import LLMProvider
from nanocats.utils.helpers import sync_workspace_templates


class SwarmManager:
    def __init__(self, bus: MessageBus, provider: LLMProvider):
        self.bus = bus
        self.provider = provider
        self.registry = AgentRegistry()
        self.agents: dict[str, AgentLoop] = {}
        self._running = False

    async def start(self):
        self._running = True

        logger.info("Loading agents from registry...")
        auto_start_agents = self.registry.get_auto_start_agents()
        logger.info("Found {} auto-start agents", len(auto_start_agents))

        for agent_config in auto_start_agents:
            await self.start_agent(agent_config)

        logger.info("Swarm fully started with {} agents", len(self.agents))

        while self._running:
            await asyncio.sleep(1)

    async def start_agent(self, config: AgentConfig):
        if config.id in self.agents:
            logger.debug("Agent {} already running", config.id)
            return

        logger.info(
            "Starting agent: {} (type={}, workspace={})",
            config.id,
            config.type.value,
            config.workspace,
        )

        # Register agent queue before creating loop
        self.bus.register_agent(config.id)

        # Sync workspace templates (SOUL.md, USER.md, AGENTS.md, TOOLS.md, memory/)
        sync_workspace_templates(config.workspace, agent_type=config.type, silent=True)

        # Create per-agent CronService with isolated storage
        cron_store = config.workspace / "cron" / "jobs.json"
        cron = CronService(cron_store)

        agent = AgentLoop(
            bus=self.bus,
            agent_config=config,
            provider=self.provider,
            cron_service=cron,
        )

        self.agents[config.id] = agent
        asyncio.create_task(agent.run())

        logger.info("Agent {} started, total agents: {}", config.id, len(self.agents))

    async def stop(self):
        self._running = False
        for agent_id in list(self.agents.keys()):
            agent = self.agents.pop(agent_id)
            agent.stop()
            await agent.close_mcp()
            logger.info("Agent {} stopped", agent_id)

    def get_agent(self, agent_id: str) -> AgentLoop | None:
        return self.agents.get(agent_id)

    def list_agents(self) -> list[dict]:
        return [
            {
                "id": agent_id,
                "running": agent._running,
            }
            for agent_id, agent in self.agents.items()
        ]
