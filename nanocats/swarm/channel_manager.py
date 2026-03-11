"""Channel manager for agent-level channel configuration."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any, Awaitable, Callable

from loguru import logger

from nanocats.bus.events import InboundMessage
from nanocats.channels.base import BaseChannel
from nanocats.config.schema import AgentChannelBindingConfig

if TYPE_CHECKING:
    from nanocats.config.schema import Config


class ChannelManager:
    """
    Manages communication channels for agents.

    Each agent can have its own set of channels configured independently.
    The manager handles:
    - Channel type registration
    - Channel lifecycle (start/stop)
    - Message routing from channels to agents
    """

    # Built-in channel types mapping
    BUILTIN_CHANNELS: dict[str, str] = {
        "telegram": "nanocats.channels.telegram:TelegramChannel",
        "discord": "nanocats.channels.discord:DiscordChannel",
        "feishu": "nanocats.channels.feishu:FeishuChannel",
        "dingtalk": "nanocats.channels.dingtalk:DingTalkChannel",
        "slack": "nanocats.channels.slack:SlackChannel",
        "matrix": "nanocats.channels.matrix:MatrixChannel",
        "email": "nanocats.channels.email:EmailChannel",
        "whatsapp": "nanocats.channels.whatsapp:WhatsAppChannel",
        "qq": "nanocats.channels.qq:QQChannel",
        "wecom": "nanocats.channels.wecom:WecomChannel",
        "mochat": "nanocats.channels.mochat:MochatChannel",
    }

    def __init__(self, global_config: Config):
        """
        Initialize the channel manager.

        Args:
            global_config: The global nanocats configuration.
        """
        self.global_config = global_config
        self._channel_registry: dict[str, type[BaseChannel]] = {}
        self._agent_channels: dict[str, list[BaseChannel]] = {}  # agent_id -> channels
        self._channel_agents: dict[str, str] = {}  # channel_key -> agent_id

        # Register built-in channels
        self._register_builtin_channels()

    def _register_builtin_channels(self) -> None:
        """Register all built-in channel types."""
        for name, import_path in self.BUILTIN_CHANNELS.items():
            try:
                self.register_channel_type(name, import_path)
            except ImportError:
                logger.debug("Channel type '{}' not available (import failed)", name)

    def register_channel_type(
        self,
        name: str,
        channel_class: type[BaseChannel] | str,
    ) -> None:
        """
        Register a channel type.

        Args:
            name: Unique name for the channel type.
            channel_class: The channel class or import path string.
        """
        if isinstance(channel_class, str):
            # Import from string path
            module_path, class_name = channel_class.rsplit(":", 1)
            try:
                import importlib
                module = importlib.import_module(module_path)
                channel_class = getattr(module, class_name)
            except (ImportError, AttributeError) as e:
                raise ImportError(f"Failed to import channel '{name}': {e}")

        self._channel_registry[name] = channel_class
        logger.debug("Registered channel type: {}", name)

    def get_channel_class(self, name: str) -> type[BaseChannel] | None:
        """
        Get a registered channel class by name.

        Args:
            name: The channel type name.

        Returns:
            The channel class or None if not found.
        """
        return self._channel_registry.get(name)

    def list_channel_types(self) -> list[str]:
        """
        List all registered channel types.

        Returns:
            List of channel type names.
        """
        return list(self._channel_registry.keys())

    async def setup_agent_channels(
        self,
        agent_id: str,
        channel_config: AgentChannelBindingConfig,
        message_handler: Callable[[InboundMessage], Awaitable[None]],
        send_callback: Callable[[Any], Awaitable[None]],
    ) -> list[BaseChannel]:
        """
        Set up channels for an agent.

        Args:
            agent_id: The agent identifier.
            channel_config: The channel binding configuration.
            message_handler: Callback for handling incoming messages.
            send_callback: Callback for sending outbound messages.

        Returns:
            List of created channel instances.
        """
        channels = []

        for channel_type in channel_config.enabled:
            channel_class = self.get_channel_class(channel_type)
            if not channel_class:
                logger.warning(
                    "Unknown channel type '{}' for agent '{}', skipping",
                    channel_type, agent_id
                )
                continue

            # Get channel-specific config
            config_data = channel_config.configs.get(channel_type, {})

            # Create a config object for the channel
            config = self._create_channel_config(channel_type, config_data)

            # Create a message bus wrapper that routes to the message handler
            from nanocats.swarm.channel_bus import AgentChannelBus
            bus = AgentChannelBus(message_handler, send_callback)

            try:
                channel = channel_class(config, bus)
                channel.bind_agent(agent_id)
                await channel.start()
                channels.append(channel)

                # Track channel -> agent mapping
                channel_key = f"{channel_type}:{channel_type}"  # Simplified key
                self._channel_agents[channel_key] = agent_id

                logger.info(
                    "Started channel '{}' for agent '{}'",
                    channel_type, agent_id
                )
            except Exception as e:
                logger.error(
                    "Failed to start channel '{}' for agent '{}': {}",
                    channel_type, agent_id, e
                )

        self._agent_channels[agent_id] = channels
        return channels

    def _create_channel_config(self, channel_type: str, config_data: dict) -> Any:
        """
        Create a channel configuration object.

        Args:
            channel_type: The channel type name.
            config_data: Raw configuration dictionary.

        Returns:
            A channel configuration object.
        """
        # Map channel types to their config classes
        config_classes = {
            "telegram": self._create_telegram_config,
            "discord": self._create_discord_config,
            "feishu": self._create_feishu_config,
            "dingtalk": self._create_dingtalk_config,
            "slack": self._create_slack_config,
            "matrix": self._create_matrix_config,
            "email": self._create_email_config,
            "whatsapp": self._create_whatsapp_config,
            "qq": self._create_qq_config,
            "wecom": self._create_wecom_config,
            "mochat": self._create_mochat_config,
        }

        creator = config_classes.get(channel_type)
        if creator:
            return creator(config_data)

        # Fallback: return a simple object with attributes
        from types import SimpleNamespace
        return SimpleNamespace(**config_data)

    def _create_telegram_config(self, data: dict) -> Any:
        from nanocats.config.schema import TelegramConfig
        return TelegramConfig(**data)

    def _create_discord_config(self, data: dict) -> Any:
        from nanocats.config.schema import DiscordConfig
        return DiscordConfig(**data)

    def _create_feishu_config(self, data: dict) -> Any:
        from nanocats.config.schema import FeishuConfig
        return FeishuConfig(**data)

    def _create_dingtalk_config(self, data: dict) -> Any:
        from nanocats.config.schema import DingTalkConfig
        return DingTalkConfig(**data)

    def _create_slack_config(self, data: dict) -> Any:
        from nanocats.config.schema import SlackConfig
        return SlackConfig(**data)

    def _create_matrix_config(self, data: dict) -> Any:
        from nanocats.config.schema import MatrixConfig
        return MatrixConfig(**data)

    def _create_email_config(self, data: dict) -> Any:
        from nanocats.config.schema import EmailConfig
        return EmailConfig(**data)

    def _create_whatsapp_config(self, data: dict) -> Any:
        from nanocats.config.schema import WhatsAppConfig
        return WhatsAppConfig(**data)

    def _create_qq_config(self, data: dict) -> Any:
        from nanocats.config.schema import QQConfig
        return QQConfig(**data)

    def _create_wecom_config(self, data: dict) -> Any:
        from nanocats.config.schema import WecomConfig
        return WecomConfig(**data)

    def _create_mochat_config(self, data: dict) -> Any:
        from nanocats.config.schema import MochatConfig
        return MochatConfig(**data)

    async def teardown_agent_channels(self, agent_id: str) -> None:
        """
        Tear down all channels for an agent.

        Args:
            agent_id: The agent identifier.
        """
        channels = self._agent_channels.pop(agent_id, [])
        for channel in channels:
            try:
                await channel.stop()
                logger.info(
                    "Stopped channel '{}' for agent '{}'",
                    channel.name, agent_id
                )
            except Exception as e:
                logger.warning(
                    "Error stopping channel for agent '{}': {}",
                    agent_id, e
                )

        # Clean up channel -> agent mappings
        keys_to_remove = [
            k for k, v in self._channel_agents.items()
            if v == agent_id
        ]
        for key in keys_to_remove:
            del self._channel_agents[key]

    def get_agent_for_channel(self, channel_type: str, chat_id: str) -> str | None:
        """
        Get the agent ID bound to a specific channel/chat.

        Args:
            channel_type: The channel type.
            chat_id: The chat identifier.

        Returns:
            The agent ID or None if not found.
        """
        key = f"{channel_type}:{chat_id}"
        return self._channel_agents.get(key)

    def get_agent_channels(self, agent_id: str) -> list[BaseChannel]:
        """
        Get all channels for an agent.

        Args:
            agent_id: The agent identifier.

        Returns:
            List of channel instances.
        """
        return self._agent_channels.get(agent_id, [])
