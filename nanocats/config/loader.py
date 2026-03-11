"""Configuration loading utilities."""

import json
from pathlib import Path

from nanocats.config.schema import AgentInstanceConfig, Config


# Global variable to store current config path (for multi-instance support)
_current_config_path: Path | None = None


def set_config_path(path: Path) -> None:
    """Set the current config path (used to derive data directory)."""
    global _current_config_path
    _current_config_path = path


def get_config_path() -> Path:
    """Get the configuration file path."""
    if _current_config_path:
        return _current_config_path
    return Path.home() / ".nanocats" / "config.json"


def load_config(config_path: Path | None = None) -> Config:
    """
    Load configuration from file or create default.

    Args:
        config_path: Optional path to config file. Uses default if not provided.

    Returns:
        Loaded configuration object.
    """
    path = config_path or get_config_path()

    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            data = _migrate_config(data)
            return Config.model_validate(data)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Warning: Failed to load config from {path}: {e}")
            print("Using default configuration.")

    return Config()


def save_config(config: Config, config_path: Path | None = None) -> None:
    """
    Save configuration to file.

    Args:
        config: Configuration to save.
        config_path: Optional path to save to. Uses default if not provided.
    """
    path = config_path or get_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    data = config.model_dump(by_alias=True)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _migrate_config(data: dict) -> dict:
    """Migrate old config formats to current."""
    # Move tools.exec.restrictToWorkspace → tools.restrictToWorkspace
    tools = data.get("tools", {})
    exec_cfg = tools.get("exec", {})
    if "restrictToWorkspace" in exec_cfg and "restrictToWorkspace" not in tools:
        tools["restrictToWorkspace"] = exec_cfg.pop("restrictToWorkspace")
    return data


def get_agents_dir(config: Config) -> Path:
    """Get the agents configuration directory path."""
    return Path(config.agents.swarm.agents_dir).expanduser()


def load_agent_configs(config: Config) -> list[AgentInstanceConfig]:
    """
    Load all agent instance configurations from the agents directory.

    Args:
        config: The main configuration object.

    Returns:
        List of AgentInstanceConfig objects.
    """
    agents_dir = get_agents_dir(config)
    if not agents_dir.exists():
        return []

    agent_configs = []
    for agent_file in agents_dir.glob("*.json"):
        try:
            with open(agent_file, encoding="utf-8") as f:
                data = json.load(f)
            agent_config = AgentInstanceConfig.model_validate(data)
            agent_configs.append(agent_config)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Warning: Failed to load agent config from {agent_file}: {e}")

    return agent_configs


def load_agent_config(agent_id: str, config: Config) -> AgentInstanceConfig | None:
    """
    Load a specific agent configuration by ID.

    Args:
        agent_id: The agent identifier.
        config: The main configuration object.

    Returns:
        AgentInstanceConfig or None if not found.
    """
    agents_dir = get_agents_dir(config)
    agent_file = agents_dir / f"{agent_id}.json"

    if not agent_file.exists():
        return None

    try:
        with open(agent_file, encoding="utf-8") as f:
            data = json.load(f)
        return AgentInstanceConfig.model_validate(data)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Warning: Failed to load agent config from {agent_file}: {e}")
        return None


def save_agent_config(agent_config: AgentInstanceConfig, config: Config) -> None:
    """
    Save an agent configuration to file.

    Args:
        agent_config: The agent configuration to save.
        config: The main configuration object.
    """
    agents_dir = get_agents_dir(config)
    agents_dir.mkdir(parents=True, exist_ok=True)

    agent_file = agents_dir / f"{agent_config.id}.json"
    data = agent_config.model_dump(by_alias=True)

    with open(agent_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def delete_agent_config(agent_id: str, config: Config) -> bool:
    """
    Delete an agent configuration file.

    Args:
        agent_id: The agent identifier.
        config: The main configuration object.

    Returns:
        True if deleted, False if not found.
    """
    agents_dir = get_agents_dir(config)
    agent_file = agents_dir / f"{agent_id}.json"

    if agent_file.exists():
        agent_file.unlink()
        return True
    return False
