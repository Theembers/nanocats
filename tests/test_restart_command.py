"""Tests for /restart slash command."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from nanocats.bus.events import InboundMessage


def _make_mock_agent_config(workspace: Path) -> MagicMock:
    """Create a mock AgentConfig for testing."""
    agent_config = MagicMock()
    agent_config.id = "test-agent"
    agent_config.model = "test-model"
    agent_config.workspace = workspace
    return agent_config


def _make_loop(tmp_path: Path | None = None):
    """Create a minimal AgentLoop with mocked dependencies."""
    from nanocats.agent.loop import AgentLoop
    from nanocats.bus.queue import MessageBus

    bus = MessageBus()
    bus.register_agent("default")  # Register default agent for per-agent routing
    provider = MagicMock()
    provider.get_default_model.return_value = "test-model"
    workspace = tmp_path or Path("/tmp/test-workspace")
    agent_config = _make_mock_agent_config(workspace)

    with patch("nanocats.agent.loop.ContextBuilder"), \
         patch("nanocats.agent.loop.SessionManager"), \
         patch("nanocats.agent.loop.SubagentManager"):
        loop = AgentLoop(bus=bus, provider=provider, agent_config=agent_config)
    return loop, bus


class TestRestartCommand:

    @pytest.mark.asyncio
    async def test_restart_sends_message_and_calls_execv(self):
        loop, bus = _make_loop()
        msg = InboundMessage(channel="cli", sender_id="user", chat_id="direct", content="/restart")

        with patch("nanocats.agent.loop.os.execv") as mock_execv:
            await loop._handle_restart(msg)
            out = await asyncio.wait_for(bus.consume_outbound(), timeout=1.0)
            assert "Restarting" in out.content

            await asyncio.sleep(1.5)
            mock_execv.assert_called_once()

    @pytest.mark.asyncio
    async def test_restart_intercepted_in_run_loop(self):
        """Verify /restart is handled at the run-loop level, not inside _dispatch."""
        loop, bus = _make_loop()
        msg = InboundMessage(
            channel="telegram", sender_id="u1", chat_id="c1",
            content="/restart", agent_id="default"
        )

        with patch.object(loop, "_handle_restart") as mock_handle:
            mock_handle.return_value = None
            await bus.publish_inbound(msg)

            loop._running = True
            run_task = asyncio.create_task(loop.run())
            await asyncio.sleep(0.1)
            loop._running = False
            run_task.cancel()
            try:
                await run_task
            except asyncio.CancelledError:
                pass

            mock_handle.assert_called_once()

    @pytest.mark.asyncio
    async def test_help_includes_restart(self):
        loop, bus = _make_loop()
        msg = InboundMessage(channel="telegram", sender_id="u1", chat_id="c1", content="/help")

        response = await loop._process_message(msg)

        assert response is not None
        assert "/restart" in response.content
