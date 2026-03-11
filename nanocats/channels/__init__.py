"""Chat channels module with plugin architecture."""

from nanocats.channels.base import BaseChannel
from nanocats.channels.manager import ChannelManager

__all__ = ["BaseChannel", "ChannelManager"]
