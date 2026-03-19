"""Channel manager for coordinating chat channels."""

from __future__ import annotations

import asyncio
from typing import Any

from loguru import logger

from nanocats.bus.queue import MessageBus
from nanocats.channels.base import BaseChannel
from nanocats.config.schema import Config


class ChannelManager:
    def __init__(
        self,
        config: Config,
        bus: MessageBus,
        agent_registry: Any = None,
    ):
        self.config = config
        self.bus = bus
        self.agent_registry = agent_registry
        self.channels: dict[str, BaseChannel] = {}
        self._dispatch_task: asyncio.Task | None = None

        self._init_channels()

    def _init_channels(self) -> None:
        from nanocats.channels.registry import discover_all

        groq_key = self.config.providers.groq.api_key
        channel_classes = discover_all()

        config_dict = self.config.channels.model_dump()
        config_dict.pop("send_progress", None)
        config_dict.pop("send_tool_hints", None)

        for instance_id, instance_config in config_dict.items():
            if not isinstance(instance_config, dict):
                continue

            enabled = instance_config.get("enabled", False)
            if not enabled:
                continue

            channel_type = instance_config.get("type", "")
            if not channel_type:
                logger.warning("Channel {} has no 'type' field, skipping", instance_id)
                continue

            cls = channel_classes.get(channel_type)
            if not cls:
                logger.warning(
                    "Unknown channel type '{}' for instance {}", channel_type, instance_id
                )
                continue

            try:
                instance_config["instance_id"] = instance_id
                channel = cls(instance_config, self.bus, self.agent_registry)
                channel.transcription_api_key = groq_key
                self.channels[instance_id] = channel
                logger.info("{} channel enabled: {}", cls.display_name, instance_id)
            except Exception as e:
                logger.warning("{} channel not available: {}", instance_id, e)

    async def _start_channel(self, name: str, channel: BaseChannel) -> None:
        """Start a channel and log any exceptions."""
        try:
            await channel.start()
        except Exception as e:
            logger.error("Failed to start channel {}: {}", name, e)

    async def start_all(self) -> None:
        """Start all channels and the outbound dispatcher."""
        if not self.channels:
            logger.warning("No channels enabled")
            return

        # Start outbound dispatcher
        self._dispatch_task = asyncio.create_task(self._dispatch_outbound())

        # Start channels
        tasks = []
        for name, channel in self.channels.items():
            logger.info("Starting {} channel...", name)
            tasks.append(asyncio.create_task(self._start_channel(name, channel)))

        # Wait for all to complete (they should run forever)
        await asyncio.gather(*tasks, return_exceptions=True)

    async def stop_all(self) -> None:
        """Stop all channels and the dispatcher."""
        logger.info("Stopping all channels...")

        if self._dispatch_task:
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass

        tasks = []
        for name, channel in self.channels.items():
            tasks.append(self._stop_channel(name, channel))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _stop_channel(self, name: str, channel) -> None:
        """Stop a single channel."""
        try:
            await channel.stop()
            logger.info("Stopped {} channel", name)
        except Exception as e:
            logger.error("Error stopping {}: {}", name, e)

    async def _dispatch_outbound(self) -> None:
        """Dispatch outbound messages to the appropriate channel."""
        logger.info("Outbound dispatcher started")

        while True:
            try:
                msg = await asyncio.wait_for(self.bus.consume_outbound(), timeout=1.0)

                if msg.metadata.get("_progress"):
                    if msg.metadata.get("_tool_hint") and not self.config.channels.send_tool_hints:
                        continue
                    if (
                        not msg.metadata.get("_tool_hint")
                        and not self.config.channels.send_progress
                    ):
                        continue

                channel = self.channels.get(msg.channel)
                if channel:
                    try:
                        await channel.send(msg)
                    except Exception as e:
                        logger.error("Error sending to {}: {}", msg.channel, e)
                else:
                    logger.warning("Unknown channel: {}", msg.channel)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

    def get_channel(self, name: str) -> BaseChannel | None:
        """Get a channel by name."""
        return self.channels.get(name)

    def get_status(self) -> dict[str, Any]:
        """Get status of all channels."""
        return {
            name: {"enabled": True, "running": channel.is_running}
            for name, channel in self.channels.items()
        }

    @property
    def enabled_channels(self) -> list[str]:
        """Get list of enabled channel names."""
        return list(self.channels.keys())
