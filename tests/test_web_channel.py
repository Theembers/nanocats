"""Tests for WebChannel."""

from __future__ import annotations

import asyncio

import pytest

from nanocats.bus.queue import MessageBus
from nanocats.channels.web import WebChannel, WebChannelConfig


@pytest.fixture
def bus():
    """Create a test message bus."""
    return MessageBus()


@pytest.fixture
def config():
    """Create test config."""
    return WebChannelConfig(
        enabled=True,
        host="127.0.0.1",
        port=15752,  # Use different port to avoid conflicts
        allow_from=["*"],
    )


@pytest.mark.asyncio
async def test_web_channel_init(config, bus):
    """Test WebChannel can be initialized."""
    channel = WebChannel(config, bus)
    assert channel.name == "web"
    assert channel.display_name == "Web UI"
    assert channel.config.port == 15752


@pytest.mark.asyncio
async def test_web_channel_default_config():
    """Test default config values."""
    config = WebChannelConfig()
    assert config.port == 15751
    assert config.host == "0.0.0.0"
    assert config.allow_from == ["*"]


@pytest.mark.asyncio
async def test_web_channel_is_allowed(config, bus):
    """Test is_allowed permission check."""
    channel = WebChannel(config, bus)

    # allow_from=["*"] should allow all
    assert channel.is_allowed("any_user") is True

    # Test with specific allow list
    config.allow_from = ["user1", "user2"]
    channel2 = WebChannel(config, bus)
    assert channel2.is_allowed("user1") is True
    assert channel2.is_allowed("user2") is True
    assert channel2.is_allowed("user3") is False


@pytest.mark.asyncio
async def test_web_channel_start_stop(config, bus):
    """Test WebChannel can start and stop."""
    channel = WebChannel(config, bus)

    # Start the channel
    await channel.start()
    assert channel._running is True

    # Stop the channel
    await channel.stop()
    assert channel._running is False


@pytest.mark.asyncio
async def test_web_channel_websocket_connect(config, bus):
    """Test WebSocket connection and basic message flow."""
    import websockets

    channel = WebChannel(config, bus)

    # Start channel in background
    start_task = asyncio.create_task(channel.start())

    # Wait for server to start
    await asyncio.sleep(1.5)

    try:
        # Connect to WebSocket
        uri = "ws://127.0.0.1:15752/ws"
        async with websockets.connect(uri) as ws:
            # Immediately send first message with user_id (no waiting for welcome)
            import json
            await ws.send(json.dumps({
                "user_id": "test_user",
                "content": "Hello"
            }))

            # Now receive welcome message
            welcome = await asyncio.wait_for(ws.recv(), timeout=5)
            data = json.loads(welcome)
            assert data["type"] == "welcome"
            assert "session_id" in data

            # Message was accepted, test passes
            # (agent response is optional in this test)

    finally:
        # Clean up
        await channel.stop()
        start_task.cancel()
        try:
            await start_task
        except asyncio.CancelledError:
            pass
