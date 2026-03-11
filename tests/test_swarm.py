"""Tests for swarm mode functionality."""

import json
import tempfile
from pathlib import Path

import pytest

from nanocats.config.schema import (
    AgentChannelBindingConfig,
    AgentInstanceConfig,
    AgentMCPConfig,
    AgentPersonalityConfig,
    AgentSkillsConfig,
    Config,
    MCPServerConfig,
    SwarmConfig,
)
from nanocats.config.loader import (
    delete_agent_config,
    load_agent_config,
    load_agent_configs,
    save_agent_config,
)
from nanocats.swarm.mcp_registry import MCPRegistry


class TestSwarmConfig:
    """Tests for swarm configuration."""

    def test_swarm_config_defaults(self):
        """Test default swarm configuration values."""
        config = SwarmConfig()
        assert config.enabled is False
        assert config.max_agents == 20
        assert config.default_agent_ttl == 3600
        assert config.mcp_registry_path == "~/.nanocats/mcp"
        assert config.agents_dir == "~/.nanocats/agents"

    def test_config_includes_swarm(self):
        """Test that Config includes swarm configuration."""
        config = Config()
        assert hasattr(config.agents, "swarm")
        assert isinstance(config.agents.swarm, SwarmConfig)


class TestAgentInstanceConfig:
    """Tests for agent instance configuration."""

    def test_agent_config_minimal(self):
        """Test minimal agent configuration."""
        config = AgentInstanceConfig(id="test_agent")
        assert config.id == "test_agent"
        assert config.type == "user"
        assert config.auto_start is True
        assert config.model is None

    def test_agent_config_full(self):
        """Test full agent configuration."""
        config = AgentInstanceConfig(
            id="alice_agent",
            name="Alice's Assistant",
            type="user",
            workspace="~/.nanocats/workspaces/alice",
            model="anthropic/claude-sonnet-4",
            personality=AgentPersonalityConfig(
                soul_file="SOUL.md",
                custom_instructions="Be helpful",
            ),
            mcp=AgentMCPConfig(
                enabled_servers=["filesystem", "web-search"],
            ),
            skills=AgentSkillsConfig(
                enabled=["github", "weather"],
            ),
            channels=AgentChannelBindingConfig(
                enabled=["telegram", "feishu"],
            ),
        )
        assert config.id == "alice_agent"
        assert config.name == "Alice's Assistant"
        assert config.model == "anthropic/claude-sonnet-4"
        assert "filesystem" in config.mcp.enabled_servers
        assert "telegram" in config.channels.enabled

    def test_agent_workspace_path(self):
        """Test workspace path resolution."""
        config = AgentInstanceConfig(id="test")
        # Default workspace
        assert "test" in str(config.workspace_path)

        config2 = AgentInstanceConfig(id="test2", workspace="/custom/path")
        assert config2.workspace_path == Path("/custom/path")


class TestAgentConfigLoader:
    """Tests for agent configuration loading."""

    def test_save_and_load_agent_config(self, tmp_path):
        """Test saving and loading agent configurations."""
        config = Config()
        config.agents.swarm.agents_dir = str(tmp_path)

        agent_config = AgentInstanceConfig(
            id="test_agent",
            name="Test Agent",
            type="user",
        )

        # Save
        save_agent_config(agent_config, config)

        # Load
        loaded = load_agent_config("test_agent", config)
        assert loaded is not None
        assert loaded.id == "test_agent"
        assert loaded.name == "Test Agent"

    def test_load_all_agent_configs(self, tmp_path):
        """Test loading all agent configurations."""
        config = Config()
        config.agents.swarm.agents_dir = str(tmp_path)

        # Create multiple agent configs
        for i in range(3):
            agent = AgentInstanceConfig(id=f"agent_{i}", name=f"Agent {i}")
            save_agent_config(agent, config)

        # Load all
        agents = load_agent_configs(config)
        assert len(agents) == 3

    def test_delete_agent_config(self, tmp_path):
        """Test deleting agent configuration."""
        config = Config()
        config.agents.swarm.agents_dir = str(tmp_path)

        agent = AgentInstanceConfig(id="to_delete")
        save_agent_config(agent, config)

        # Verify exists
        assert load_agent_config("to_delete", config) is not None

        # Delete
        result = delete_agent_config("to_delete", config)
        assert result is True

        # Verify deleted
        assert load_agent_config("to_delete", config) is None

    def test_load_nonexistent_agent(self, tmp_path):
        """Test loading non-existent agent configuration."""
        config = Config()
        config.agents.swarm.agents_dir = str(tmp_path)

        result = load_agent_config("nonexistent", config)
        assert result is None


class TestMCPRegistry:
    """Tests for MCP registry."""

    def test_mcp_registry_install(self, tmp_path):
        """Test installing MCP server to registry."""
        registry = MCPRegistry(tmp_path)

        server_config = MCPServerConfig(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem"],
        )

        registry.install_server("filesystem", server_config)

        # Verify installed
        loaded = registry.get_server("filesystem")
        assert loaded is not None
        assert loaded.command == "npx"

    def test_mcp_registry_uninstall(self, tmp_path):
        """Test uninstalling MCP server from registry."""
        registry = MCPRegistry(tmp_path)

        server_config = MCPServerConfig(command="npx", args=["-y", "test"])
        registry.install_server("test", server_config)

        # Uninstall
        result = registry.uninstall_server("test")
        assert result is True

        # Verify uninstalled
        assert registry.get_server("test") is None

    def test_mcp_registry_create_agent_config(self, tmp_path):
        """Test creating agent MCP configuration from registry."""
        registry = MCPRegistry(tmp_path)

        # Install servers
        registry.install_server("filesystem", MCPServerConfig(command="npx", args=["-y", "fs"]))
        registry.install_server("web-search", MCPServerConfig(command="npx", args=["-y", "web"]))

        # Create agent config
        agent_mcp = registry.create_agent_mcp_config(
            enabled_servers=["filesystem"],
            custom_servers={"custom": MCPServerConfig(command="python", args=["custom.py"])},
        )

        assert "filesystem" in agent_mcp
        assert "custom" in agent_mcp
        assert "web-search" not in agent_mcp

    def test_mcp_registry_persistence(self, tmp_path):
        """Test that registry persists to disk."""
        registry1 = MCPRegistry(tmp_path)

        server_config = MCPServerConfig(command="npx", args=["-y", "test"])
        registry1.install_server("test", server_config)

        # Create new registry instance (should load from disk)
        registry2 = MCPRegistry(tmp_path)
        loaded = registry2.get_server("test")

        assert loaded is not None
        assert loaded.command == "npx"


class TestAgentChannelBindingConfig:
    """Tests for agent channel binding configuration."""

    def test_channel_binding_defaults(self):
        """Test default channel binding configuration."""
        config = AgentChannelBindingConfig()
        assert config.enabled == []
        assert config.configs == {}

    def test_channel_binding_with_configs(self):
        """Test channel binding with configurations."""
        config = AgentChannelBindingConfig(
            enabled=["telegram", "feishu"],
            configs={
                "telegram": {
                    "token": "bot123",
                    "allow_from": ["123456"],
                },
                "feishu": {
                    "app_id": "cli_xxx",
                    "app_secret": "secret",
                },
            },
        )
        assert "telegram" in config.enabled
        assert config.configs["telegram"]["token"] == "bot123"


class TestAgentPersonalityConfig:
    """Tests for agent personality configuration."""

    def test_personality_defaults(self):
        """Test default personality configuration."""
        config = AgentPersonalityConfig()
        assert config.soul_file == "SOUL.md"
        assert config.custom_instructions == ""
        assert config.agents_file == "AGENTS.md"

    def test_personality_custom(self):
        """Test custom personality configuration."""
        config = AgentPersonalityConfig(
            soul_file="custom_soul.md",
            custom_instructions="You are a helpful coding assistant.",
        )
        assert config.soul_file == "custom_soul.md"
        assert "coding" in config.custom_instructions
