"""WebUI FastAPI application."""

import asyncio
import os
import socket
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nanocats.webui.api import router

GATEWAY_PORT = int(os.environ.get("GATEWAY_PORT", "15751"))


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    from nanocats.db import Database

    db = await Database.get_instance()

    async def monitor_gateway():
        while True:
            await asyncio.sleep(5)
            if not is_port_in_use(GATEWAY_PORT):
                import logging

                logging.getLogger("webui").info("Gateway stopped, exiting...")
                import os

                os._exit(0)

    task = asyncio.create_task(monitor_gateway())

    yield

    task.cancel()
    await db.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="nanocats WebUI API",
        description="REST API for nanocats WebUI management interface",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    return app


app = create_app()
