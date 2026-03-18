"""Agent registry for managing multiple agents."""

from loguru import logger

from nanocats.agent.config import AgentConfigLoader
from nanocats.config.schema import AgentConfig, AgentType, ChannelConfig


class AgentRegistry:
    """Agent registry for looking up and routing to agents."""

    def __init__(self):
        self._agents: dict[str, AgentConfig] = {}
        self._load()

    def _load(self):
        self._agents = AgentConfigLoader.load_all()

    def reload(self):
        self._load()

    def get(self, agent_id: str) -> AgentConfig | None:
        return self._agents.get(agent_id)

    def get_all(self) -> dict[str, AgentConfig]:
        return self._agents.copy()

    def get_auto_start_agents(self) -> list[AgentConfig]:
        return [a for a in self._agents.values() if a.auto_start]

    def find_by_channel(self, channel: str, chat_id: str) -> tuple[AgentConfig, str | None] | None:
        """Find agent by channel and chat_id."""
        for agent in self._agents.values():
            logger.info(
                "Checking agent {} for channel={}, chat_id={}",
                agent.id,
                channel,
                chat_id,
            )

            channel_cfg = agent.channels.configs.get(channel)
            if not channel_cfg or not channel_cfg.enabled:
                logger.info("Agent {}: channel {} not enabled", agent.id, channel)
                continue

            if not self._is_chat_allowed(channel_cfg, chat_id):
                logger.info(
                    "Agent {}: chat_id {} not in allow_from {}",
                    agent.id,
                    chat_id,
                    channel_cfg.allow_from,
                )
                continue

            group_id = self._find_session_group(agent, channel, chat_id)
            logger.info(
                "Resolved agent {} for channel={}, chat_id={}, group_id={}",
                agent.id,
                channel,
                chat_id,
                group_id,
            )
            return agent, group_id

        logger.warning("No agent found for channel={}, chat_id={}", channel, chat_id)
        return None

    def _is_chat_allowed(self, channel_cfg: ChannelConfig, chat_id: str) -> bool:
        allow_list = channel_cfg.allow_from
        if not allow_list:
            return False
        if "*" in allow_list:
            return True
        return chat_id in allow_list

    def _find_session_group(self, agent: AgentConfig, channel: str, chat_id: str) -> str | None:
        for sg in agent.channels.session_groups:
            if channel in sg.chat_ids and sg.chat_ids[channel] == chat_id:
                return sg.group_id
        return None

    def resolve_session_key(self, agent: AgentConfig, group_id: str | None = None) -> str:
        """Resolve session key based on agent type."""
        if agent.type == AgentType.ADMIN:
            return "global"
        elif agent.type == AgentType.USER:
            return f"user:{agent.id}:{group_id or 'default'}"
        elif agent.type == AgentType.SPECIALIZED:
            return f"agent:{agent.id}"
        elif agent.type == AgentType.TASK:
            return f"task:{agent.id}"
        raise ValueError(f"Unknown agent type: {agent.type}")

    def can_communicate(self, from_agent_id: str, to_agent_id: str) -> bool:
        from_agent = self.get(from_agent_id)
        to_agent = self.get(to_agent_id)
        if not from_agent or not to_agent:
            return False
        return to_agent_id in from_agent.channels.allow_agents
