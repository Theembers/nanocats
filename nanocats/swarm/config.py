"""Agent configuration loader for swarm mode."""

from pathlib import Path

from loguru import logger

from nanocats.config.schema import AgentInstanceConfig, Config


class AgentConfigLoader:
    """
    Loader and resolver for agent instance configurations.

    Handles loading agent configs and resolving inherited values from defaults.
    """

    def __init__(self, config: Config):
        """
        Initialize the agent config loader.

        Args:
            config: The main nanocats configuration.
        """
        self.config = config
        self.defaults = config.agents.defaults

    def resolve_config(self, agent_config: AgentInstanceConfig) -> AgentInstanceConfig:
        """
        Resolve an agent config by filling in defaults.

        Args:
            agent_config: The agent-specific configuration.

        Returns:
            Resolved configuration with defaults filled in.
        """
        # Create a copy to avoid modifying the original
        resolved_data = agent_config.model_dump()

        # Apply defaults for unset values
        if resolved_data.get("model") is None:
            resolved_data["model"] = self.defaults.model

        if resolved_data.get("provider") is None:
            resolved_data["provider"] = self.defaults.provider

        if resolved_data.get("max_tokens") is None:
            resolved_data["max_tokens"] = self.defaults.max_tokens

        if resolved_data.get("context_window_tokens") is None:
            resolved_data["context_window_tokens"] = self.defaults.context_window_tokens

        if resolved_data.get("temperature") is None:
            resolved_data["temperature"] = self.defaults.temperature

        if resolved_data.get("max_tool_iterations") is None:
            resolved_data["max_tool_iterations"] = self.defaults.max_tool_iterations

        # Ensure workspace is set
        if not resolved_data.get("workspace"):
            resolved_data["workspace"] = f"~/.nanocats/workspaces/{agent_config.id}"

        return AgentInstanceConfig.model_validate(resolved_data)

    def get_workspace_path(self, agent_config: AgentInstanceConfig) -> Path:
        """
        Get the workspace path for an agent.

        Args:
            agent_config: The agent configuration.

        Returns:
            Expanded workspace path.
        """
        return agent_config.workspace_path

    def setup_workspace(self, agent_config: AgentInstanceConfig) -> Path:
        """
        Setup the workspace directory for an agent.

        Creates the workspace directory, necessary subdirectories, and syncs
        template files (AGENTS.md, SOUL.md, USER.md, TOOLS.md, HEARTBEAT.md)
        if they don't already exist.

        Args:
            agent_config: The agent configuration.

        Returns:
            The workspace path.
        """
        from nanocats.utils.helpers import sync_workspace_templates

        workspace = self.get_workspace_path(agent_config)
        workspace.mkdir(parents=True, exist_ok=True)

        # Create standard subdirectories
        (workspace / "memory").mkdir(exist_ok=True)
        (workspace / "skills").mkdir(exist_ok=True)
        (workspace / "sessions").mkdir(exist_ok=True)

        # Sync template files (only creates missing files, never overwrites)
        sync_workspace_templates(workspace, silent=True)

        logger.debug("Setup workspace for agent '{}': {}", agent_config.id, workspace)
        return workspace
