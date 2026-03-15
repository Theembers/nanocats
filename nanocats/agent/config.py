"""Agent configuration loader."""

import json
from pathlib import Path

from loguru import logger

from nanocats.config.schema import (
    AgentChannelsConfig,
    AgentConfig,
    AgentType,
    ChannelConfig,
    SessionGroup,
)


class AgentConfigLoader:
    """Agent configuration loader from JSON files."""

    AGENTS_DIR = Path.home() / ".nanocats" / "agents"

    @classmethod
    def get_agents_dir(cls) -> Path:
        cls.AGENTS_DIR.mkdir(parents=True, exist_ok=True)
        return cls.AGENTS_DIR

    @classmethod
    def load(cls, agent_id: str) -> AgentConfig | None:
        config_path = cls.get_agents_dir() / f"{agent_id}.json"
        if not config_path.exists():
            logger.warning("Agent config not found: {}", agent_id)
            return None

        logger.info("Loading agent config: {}", agent_id)

        with open(config_path, encoding="utf-8") as f:
            data = json.load(f)

        return cls._parse(agent_id, data)

    @classmethod
    def load_all(cls) -> dict[str, AgentConfig]:
        agents = {}
        for path in cls.get_agents_dir().glob("*.json"):
            agent_id = path.stem
            if config := cls.load(agent_id):
                agents[agent_id] = config
        return agents

    @classmethod
    def _parse(cls, agent_id: str, data: dict) -> AgentConfig:
        channels_data = data.get("channels", {})
        configs = {}
        for name, ch_data in channels_data.get("configs", {}).items():
            standard_fields = {"enabled", "allowFrom"}
            extra = {k: v for k, v in ch_data.items() if k not in standard_fields}
            configs[name] = ChannelConfig(
                enabled=ch_data.get("enabled", False),
                allow_from=ch_data.get("allowFrom", []),
                extra=extra,
            )

        session_groups = [
            SessionGroup(group_id=sg["groupId"], chat_ids=sg["chatIds"])
            for sg in channels_data.get("sessionGroups", [])
        ]

        channels = AgentChannelsConfig(
            configs=configs,
            session_groups=session_groups,
            allow_agents=channels_data.get("allowAgents", []),
        )

        return AgentConfig(
            id=agent_id,
            name=data.get("name", agent_id),
            type=AgentType(data.get("type", "user")),
            channels=channels,
            session_policy=data.get("sessionPolicy", "per_user"),
            model=data.get("model", "anthropic/claude-opus-4-5"),
            provider=data.get("provider", "anthropic"),
            ttl=data.get("ttl"),
            auto_start=data.get("autoStart", True),
            routing=data.get("routing", {}),
        )
