"""Web channel implementation using FastAPI + WebSocket."""

from __future__ import annotations

import asyncio
import os
import shutil
import signal
import subprocess
import threading
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from loguru import logger
from pydantic import Field
from uvicorn import Server, Config

from nanocats.bus.events import InboundMessage, OutboundMessage
from nanocats.bus.queue import MessageBus
from nanocats.channels.base import BaseChannel
from nanocats.config.schema import ChannelInstanceConfig, FrontendConfig
from nanocats.db import record_log


class WebChannelConfig(ChannelInstanceConfig):
    type: str = "web"
    host: str = "0.0.0.0"
    port: int = 15751
    allow_from: list[str] = Field(default_factory=lambda: ["*"])
    frontend: FrontendConfig | None = None


class WebChannel(BaseChannel):
    """
    Web channel for browser-based chat interface via WebSocket.
    """

    name = "web"
    display_name = "Web UI"

    @classmethod
    def default_config(cls) -> dict[str, Any]:
        return WebChannelConfig().model_dump(by_alias=True)

    def __init__(self, config: Any, bus: MessageBus, agent_registry: Any = None):
        if isinstance(config, dict):
            config = WebChannelConfig.model_validate(config)
        super().__init__(config, bus, agent_registry)
        self._app: FastAPI | None = None
        self._server: Server | None = None
        self._connections: dict[str, WebSocket] = {}
        self._ws_to_session: dict[WebSocket, str] = {}
        self._session_to_agent: dict[str, str] = {}
        self._frontend_process: subprocess.Popen | None = None
        self._frontend_dir: Path | None = None

    def _get_frontend_dir(self) -> Path | None:
        if self._frontend_dir:
            return self._frontend_dir

        candidates = [
            Path.cwd() / "frontend",
            Path(__file__).parent.parent.parent / "frontend",
            Path.home() / ".nanocats" / "frontend",
        ]

        for path in candidates:
            if (path / "package.json").exists():
                self._frontend_dir = path
                return path

        return None

    async def _start_frontend(self) -> None:
        frontend_config = self.config.frontend
        if not frontend_config or not frontend_config.enabled:
            return

        frontend_dir = self._get_frontend_dir()
        if not frontend_dir:
            logger.warning("Frontend directory not found, skipping frontend start")
            return

        npm_path = shutil.which("npm")
        if not npm_path:
            logger.warning("npm not found, skipping frontend start")
            return

        if frontend_config.mode == "preview":
            dist_dir = frontend_dir / "dist"
            if not dist_dir.exists():
                logger.info("Building frontend for preview mode...")
                try:
                    subprocess.run(
                        [npm_path, "run", "build"],
                        cwd=frontend_dir,
                        check=True,
                        capture_output=True,
                    )
                except subprocess.CalledProcessError as e:
                    logger.error(f"Frontend build failed: {e.stderr.decode()}")
                    return

        cmd = [npm_path, "run", "dev" if frontend_config.mode == "dev" else "preview"]
        env = {**os.environ, "PORT": str(frontend_config.port)}

        logger.info(
            "Starting frontend at port {} ({} mode)", frontend_config.port, frontend_config.mode
        )

        self._frontend_process = subprocess.Popen(
            cmd,
            cwd=frontend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )

        async def monitor_gateway():
            while self._running:
                await asyncio.sleep(5)
                if not self._is_port_open(15751):
                    logger.info("Gateway stopped, stopping frontend...")
                    self._stop_frontend()
                    break

        asyncio.create_task(monitor_gateway())
        await asyncio.sleep(2)

    def _is_port_open(self, port: int) -> bool:
        import socket

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(("localhost", port)) == 0

    def _stop_frontend(self) -> None:
        if self._frontend_process:
            self._frontend_process.terminate()
            try:
                self._frontend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._frontend_process.kill()
            self._frontend_process = None

    async def start(self) -> None:
        """Start the web channel server."""
        self._running = True
        self._app = FastAPI()

        @self._app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            session_id: str | None = None
            user_id: str | None = None

            try:
                await websocket.accept()

                try:
                    data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                except asyncio.TimeoutError:
                    await websocket.close(code=4000, reason="Missing initial user_id")
                    return

                user_id = data.get("user_id")
                if not user_id:
                    await websocket.send_json(
                        {"type": "error", "message": "user_id is required in first message"}
                    )
                    await websocket.close(code=4001, reason="Missing user_id")
                    return

                if not self.is_allowed(user_id):
                    await websocket.send_json({"type": "error", "message": "Access denied"})
                    await websocket.close(code=4003, reason="Access denied")
                    return

                session_id = user_id
                self._connections[session_id] = websocket
                self._ws_to_session[websocket] = session_id

                agent_id = data.get("agent_id")
                if agent_id:
                    self._session_to_agent[session_id] = agent_id

                logger.info("Web client connected: user_id={}", user_id)
                record_log(
                    level="INFO",
                    log_type="channel",
                    message=f"Web client connected: user_id={user_id}",
                    channel="web",
                )

                await websocket.send_json(
                    {
                        "type": "welcome",
                        "session_id": session_id,
                        "message": "Connected to nanocats",
                    }
                )

                content = data.get("content", "")
                if content:
                    await self._handle_message(
                        sender_id=user_id,
                        chat_id=session_id,
                        content=content,
                        session_key=session_id,
                    )

                while self._running:
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
                        msg_type = data.get("type", "message")

                        if msg_type == "command":
                            await self._handle_command(
                                websocket=websocket,
                                user_id=user_id,
                                session_id=session_id,
                                command=data.get("command", ""),
                                channel=data.get("channel", "web"),
                                chat_id=data.get("chat_id", session_id),
                            )
                        elif msg_type == "typing":
                            await self._handle_typing(
                                user_id=user_id,
                                session_id=session_id,
                                typing=data.get("typing", False),
                            )
                        else:
                            content = data.get("content", "")
                            if content:
                                await self._handle_message(
                                    sender_id=user_id,
                                    chat_id=session_id,
                                    content=content,
                                    session_key=session_id,
                                )

                    except asyncio.TimeoutError:
                        continue
                    except ValueError as e:
                        logger.warning("Invalid JSON from client: {}", e)
                        await websocket.send_json({"type": "error", "message": "Invalid JSON"})

            except WebSocketDisconnect:
                logger.info("Web client disconnected: session_id={}", session_id)
                record_log(
                    level="INFO",
                    log_type="channel",
                    message=f"Web client disconnected: session_id={session_id}",
                    channel="web",
                )
            finally:
                if session_id:
                    self._connections.pop(session_id, None)
                self._ws_to_session.pop(websocket, None)
                if session_id:
                    self._session_to_agent.pop(session_id, None)

        @self._app.websocket("/ws/{agent_id}")
        async def websocket_endpoint_with_agent(websocket: WebSocket, agent_id: str):
            session_id: str | None = None
            user_id: str | None = None

            try:
                await websocket.accept()

                try:
                    data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                except asyncio.TimeoutError:
                    await websocket.close(code=4000, reason="Missing initial user_id")
                    return

                user_id = data.get("user_id")
                if not user_id:
                    await websocket.send_json(
                        {"type": "error", "message": "user_id is required in first message"}
                    )
                    await websocket.close(code=4001, reason="Missing user_id")
                    return

                if not self.is_allowed(user_id):
                    await websocket.send_json({"type": "error", "message": "Access denied"})
                    await websocket.close(code=4003, reason="Access denied")
                    return

                session_id = f"{agent_id}:{user_id}"
                self._connections[session_id] = websocket
                self._ws_to_session[websocket] = session_id
                self._session_to_agent[session_id] = agent_id

                logger.info("Web client connected: user_id={}, agent_id={}", user_id, agent_id)
                record_log(
                    level="INFO",
                    log_type="channel",
                    message=f"Web client connected: user_id={user_id}, agent_id={agent_id}",
                    channel="web",
                )

                await websocket.send_json(
                    {
                        "type": "welcome",
                        "session_id": session_id,
                        "agent_id": agent_id,
                        "message": f"Connected to {agent_id}",
                    }
                )

                content = data.get("content", "")
                if content:
                    await self._handle_message(
                        sender_id=user_id,
                        chat_id=session_id,
                        content=content,
                        session_key=session_id,
                        metadata={"agent_id": agent_id},
                    )

                while self._running:
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
                        msg_type = data.get("type", "message")

                        if msg_type == "command":
                            await self._handle_command(
                                websocket=websocket,
                                user_id=user_id,
                                session_id=session_id,
                                command=data.get("command", ""),
                                channel=data.get("channel", "web"),
                                chat_id=data.get("chat_id", session_id),
                                agent_id=agent_id,
                            )
                        elif msg_type == "typing":
                            await self._handle_typing(
                                user_id=user_id,
                                session_id=session_id,
                                typing=data.get("typing", False),
                            )
                        else:
                            content = data.get("content", "")
                            if content:
                                await self._handle_message(
                                    sender_id=user_id,
                                    chat_id=session_id,
                                    content=content,
                                    session_key=session_id,
                                    metadata={"agent_id": agent_id},
                                )

                    except asyncio.TimeoutError:
                        continue
                    except ValueError as e:
                        logger.warning("Invalid JSON from client: {}", e)
                        await websocket.send_json({"type": "error", "message": "Invalid JSON"})

            except WebSocketDisconnect:
                logger.info("Web client disconnected: session_id={}", session_id)
                record_log(
                    level="INFO",
                    log_type="channel",
                    message=f"Web client disconnected: session_id={session_id}",
                    channel="web",
                )
            finally:
                if session_id:
                    self._connections.pop(session_id, None)
                self._ws_to_session.pop(websocket, None)
                if session_id:
                    self._session_to_agent.pop(session_id, None)

        @self._app.get("/health")
        async def health():
            return {"status": "ok"}

        config = Config(
            app=self._app,
            host=self.config.host,
            port=self.config.port,
            log_level="warning",
        )
        self._server = Server(config)

        logger.info("Starting Web channel on {}:{}", self.config.host, self.config.port)
        asyncio.create_task(self._server.serve())

        await self._start_frontend()

    async def stop(self) -> None:
        """Stop the web channel."""
        self._running = False

        self._stop_frontend()

        for ws in list(self._connections.values()):
            try:
                await ws.close()
            except Exception:
                pass
        self._connections.clear()
        self._ws_to_session.clear()
        self._session_to_agent.clear()

        if self._server:
            self._server.should_exit = True

    async def send(self, msg: OutboundMessage) -> None:
        """Send a message to the appropriate WebSocket connection."""
        ws = self._connections.get(msg.chat_id)
        if ws:
            try:
                await ws.send_json(
                    {
                        "type": "message",
                        "content": msg.content,
                        "metadata": msg.metadata,
                    }
                )
            except Exception as e:
                logger.warning("Failed to send message to web client: {}", e)

    async def _handle_command(
        self,
        websocket: WebSocket,
        user_id: str,
        session_id: str,
        command: str,
        channel: str = "web",
        chat_id: str | None = None,
        agent_id: str | None = None,
    ) -> None:
        """Handle special commands from WebSocket client."""
        command = command.strip()

        if command == "/new":
            await websocket.send_json(
                {
                    "type": "command_response",
                    "command": "/new",
                    "status": "success",
                    "message": "New session started",
                }
            )
            logger.info("Command /new executed for user_id={}", user_id)

        elif command == "/stop":
            await websocket.send_json(
                {
                    "type": "command_response",
                    "command": "/stop",
                    "status": "success",
                    "message": "Current processing stopped",
                }
            )
            logger.info("Command /stop executed for user_id={}", user_id)

        elif command == "/restart":
            await websocket.send_json(
                {
                    "type": "command_response",
                    "command": "/restart",
                    "status": "success",
                    "message": "Agent restarted",
                }
            )
            logger.info("Command /restart executed for user_id={}", user_id)

        elif command == "/help":
            help_text = """Available commands:
/new - Start a new session
/stop - Stop current processing
/restart - Restart the agent
/help - Show this help message"""
            await websocket.send_json(
                {
                    "type": "command_response",
                    "command": "/help",
                    "status": "success",
                    "message": help_text,
                }
            )

        else:
            await websocket.send_json(
                {
                    "type": "command_response",
                    "command": command,
                    "status": "error",
                    "message": f"Unknown command: {command}",
                }
            )

    async def _handle_typing(
        self,
        user_id: str,
        session_id: str,
        typing: bool,
    ) -> None:
        """Handle typing indicator."""
        logger.debug("Typing indicator from {}: {}", user_id, typing)
