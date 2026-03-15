"""WebUI API routes."""

from fastapi import APIRouter

from nanocats.webui.api import (
    agent_routes,
    analytics_routes,
    auth_routes,
    channel_routes,
    cron_routes,
    log_routes,
    mcp_routes,
    memory_routes,
    message_routes,
    queue_routes,
    skill_routes,
    workspace_routes,
)

router = APIRouter(prefix="/api")

router.include_router(auth_routes.router)
router.include_router(agent_routes.router)
router.include_router(channel_routes.router)
router.include_router(workspace_routes.router)
router.include_router(skill_routes.router)
router.include_router(mcp_routes.router)
router.include_router(cron_routes.router)
router.include_router(memory_routes.router)
router.include_router(message_routes.router)
router.include_router(queue_routes.router)
router.include_router(analytics_routes.router)
router.include_router(log_routes.router)
