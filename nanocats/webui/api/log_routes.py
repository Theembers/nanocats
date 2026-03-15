"""Log API routes."""

from fastapi import APIRouter, Depends, HTTPException

from nanocats.db import get_db
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user

router = APIRouter(prefix="", tags=["logs"])


@router.get("/logs", response_model=dict)
async def get_logs(
    type: str | None = None,
    agent_id: str | None = None,
    channel: str | None = None,
    level: str | None = None,
    keyword: str | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = await get_db()
    results, has_more = await db.query_logs(
        log_type=type,
        agent_id=agent_id,
        channel=channel,
        level=level,
        keyword=keyword,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )

    logs = []
    for r in results:
        logs.append(
            {
                "timestamp": r.get("timestamp"),
                "level": r.get("level"),
                "type": r.get("type"),
                "agent_id": r.get("agent_id"),
                "session_key": r.get("session_key"),
                "channel": r.get("channel"),
                "message": r.get("message"),
                "metadata": r.get("metadata"),
                "tool_name": r.get("tool_name"),
            }
        )

    return {"logs": logs, "pagination": {"has_more": has_more}}
