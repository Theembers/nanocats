"""MCP Registry for centralized MCP server management."""

import json
from pathlib import Path
from typing import Any

from loguru import logger

from nanocats.config.schema import MCPServerConfig


class MCPRegistry:
    """
    Centralized MCP server registry.

    MCP servers are installed centrally but configured per-agent.
    This allows sharing common MCP servers while enabling agent-specific configurations.
    """

    def __init__(self, registry_path: Path):
        """
        Initialize the MCP registry.

        Args:
            registry_path: Path to the directory containing installed MCP server configs.
        """
        self.registry_path = Path(registry_path).expanduser()
        self._installed_servers: dict[str, MCPServerConfig] = {}
        self._loaded = False

    def _ensure_loaded(self) -> None:
        """Lazy load the registry on first access."""
        if self._loaded:
            return
        self.load_registry()
        self._loaded = True

    def load_registry(self) -> None:
        """Load installed MCP servers from the registry file."""
        registry_file = self.registry_path / "installed.json"
        if not registry_file.exists():
            logger.debug("MCP registry file not found: {}", registry_file)
            return

        try:
            with open(registry_file, encoding="utf-8") as f:
                data = json.load(f)

            for name, config_data in data.items():
                try:
                    self._installed_servers[name] = MCPServerConfig.model_validate(config_data)
                except Exception as e:
                    logger.warning("Failed to parse MCP server '{}': {}", name, e)

            logger.info("Loaded {} MCP servers from registry", len(self._installed_servers))
        except (json.JSONDecodeError, OSError) as e:
            logger.error("Failed to load MCP registry: {}", e)

    def save_registry(self) -> None:
        """Save the current registry to file."""
        self.registry_path.mkdir(parents=True, exist_ok=True)
        registry_file = self.registry_path / "installed.json"

        data = {
            name: config.model_dump(by_alias=True)
            for name, config in self._installed_servers.items()
        }

        with open(registry_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.debug("Saved {} MCP servers to registry", len(self._installed_servers))

    def install_server(self, name: str, config: MCPServerConfig) -> None:
        """
        Install an MCP server to the registry.

        Args:
            name: Unique name for the MCP server.
            config: Server configuration.
        """
        self._ensure_loaded()
        self._installed_servers[name] = config
        self.save_registry()
        logger.info("Installed MCP server: {}", name)

    def uninstall_server(self, name: str) -> bool:
        """
        Uninstall an MCP server from the registry.

        Args:
            name: Name of the MCP server to uninstall.

        Returns:
            True if the server was removed, False if not found.
        """
        self._ensure_loaded()
        if name in self._installed_servers:
            del self._installed_servers[name]
            self.save_registry()
            logger.info("Uninstalled MCP server: {}", name)
            return True
        return False

    def get_server(self, name: str) -> MCPServerConfig | None:
        """
        Get an installed MCP server configuration.

        Args:
            name: Name of the MCP server.

        Returns:
            MCPServerConfig or None if not found.
        """
        self._ensure_loaded()
        return self._installed_servers.get(name)

    def list_servers(self) -> list[str]:
        """
        List all installed MCP server names.

        Returns:
            List of server names.
        """
        self._ensure_loaded()
        return list(self._installed_servers.keys())

    def create_agent_mcp_config(
        self,
        enabled_servers: list[str],
        custom_servers: dict[str, MCPServerConfig] | None = None,
    ) -> dict[str, MCPServerConfig]:
        """
        Create MCP configuration for an agent.

        Combines system-installed servers (enabled for this agent) with
        agent-specific custom servers.

        Args:
            enabled_servers: List of system server names to enable.
            custom_servers: Agent-specific custom MCP servers.

        Returns:
            Dictionary of MCP server name -> configuration.
        """
        self._ensure_loaded()
        result: dict[str, MCPServerConfig] = {}

        # Add enabled system servers
        for name in enabled_servers:
            if config := self._installed_servers.get(name):
                result[name] = config
            else:
                logger.warning("Requested MCP server '{}' not found in registry", name)

        # Add custom servers (can override system servers)
        if custom_servers:
            for name, config in custom_servers.items():
                result[name] = config
                logger.debug("Added custom MCP server: {}", name)

        return result

    def get_server_info(self, name: str) -> dict[str, Any] | None:
        """
        Get detailed information about an installed MCP server.

        Args:
            name: Name of the MCP server.

        Returns:
            Dictionary with server info or None if not found.
        """
        config = self.get_server(name)
        if not config:
            return None

        return {
            "name": name,
            "type": config.type or "auto",
            "command": config.command or "",
            "args": config.args,
            "url": config.url or "",
            "tool_timeout": config.tool_timeout,
        }
