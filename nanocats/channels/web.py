"""Web channel implementation using FastAPI + WebSocket."""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from loguru import logger
from pydantic import Field
from uvicorn import Server, Config

from nanocats.bus.events import OutboundMessage
from nanocats.bus.queue import MessageBus
from nanocats.channels.base import BaseChannel
from nanocats.config.schema import Base


class WebChannelConfig(Base):
    """Web channel configuration."""

    enabled: bool = False
    host: str = "0.0.0.0"
    port: int = 15751
    allow_from: list[str] = Field(default_factory=lambda: ["*"])


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
        # 存储 WebSocket 连接: session_id -> websocket (实例变量)
        self._connections: dict[str, WebSocket] = {}
        self._ws_to_session: dict[WebSocket, str] = {}

    async def start(self) -> None:
        """Start the web channel server."""
        self._running = True
        self._app = FastAPI()

        @self._app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            # 客户端必须通过第一个消息提供 user_id 来建立会话
            session_id: str | None = None
            user_id: str | None = None

            try:
                await websocket.accept()

                # 等待第一个消息来建立会话身份
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

                # 权限检查
                if not self.is_allowed(user_id):
                    await websocket.send_json({"type": "error", "message": "Access denied"})
                    await websocket.close(code=4003, reason="Access denied")
                    return

                session_id = user_id  # 使用 user_id 作为 session_id
                self._connections[session_id] = websocket
                self._ws_to_session[websocket] = session_id
                logger.info("Web client connected: user_id={}", user_id)

                # 发送欢迎消息
                await websocket.send_json(
                    {
                        "type": "welcome",
                        "session_id": session_id,
                        "message": "Connected to nanocats",
                    }
                )

                # 第一个消息也需要处理
                content = data.get("content", "")
                if content:
                    await self._handle_message(
                        sender_id=user_id,
                        chat_id=session_id,
                        content=content,
                        session_key=session_id,
                    )

                # 继续监听后续消息
                while self._running:
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
                        content = data.get("content", "")

                        if not content:
                            continue

                        # 发送到消息总线
                        await self._handle_message(
                            sender_id=user_id,
                            chat_id=session_id,
                            content=content,
                            session_key=session_id,
                        )

                    except asyncio.TimeoutError:
                        # 心跳检测
                        continue
                    except ValueError as e:
                        logger.warning("Invalid JSON from client: {}", e)
                        await websocket.send_json({"type": "error", "message": "Invalid JSON"})

            except WebSocketDisconnect:
                logger.info("Web client disconnected: session_id={}", session_id)
            finally:
                self._connections.pop(session_id, None)
                self._ws_to_session.pop(websocket, None)

        @self._app.get("/health")
        async def health():
            return {"status": "ok"}

        # 启动 uvicorn 服务器
        config = Config(
            app=self._app,
            host=self.config.host,
            port=self.config.port,
            log_level="warning",
        )
        self._server = Server(config)

        logger.info("Starting Web channel on {}:{}", self.config.host, self.config.port)
        asyncio.create_task(self._server.serve())

    async def stop(self) -> None:
        """Stop the web channel."""
        self._running = False

        # 关闭所有 WebSocket 连接
        for ws in list(self._connections.values()):
            try:
                await ws.close()
            except Exception:
                pass
        self._connections.clear()
        self._ws_to_session.clear()

        # 停止服务器
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
                        "sender": msg.sender,
                    }
                )
            except Exception as e:
                logger.warning("Failed to send message to web client: {}", e)
