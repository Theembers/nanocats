"""Queue API routes."""

import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["queue"])

QUEUE_DIR = Path.home() / ".nanocats" / "data" / "queues"


def _get_queue_file(agent_id: str) -> Path:
    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    return QUEUE_DIR / f"{agent_id}.jsonl"


def _load_queue(agent_id: str) -> list[dict]:
    queue_file = _get_queue_file(agent_id)
    if not queue_file.exists():
        return []
    items = []
    with open(queue_file, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                try:
                    items.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue
    return items


def _save_queue(agent_id: str, items: list[dict]) -> None:
    queue_file = _get_queue_file(agent_id)
    with open(queue_file, "w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


@router.get("/{agent_id}/queue", response_model=dict)
async def get_queue(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    queue = _load_queue(agent_id)
    return {"queue": queue}


@router.post("/{agent_id}/queue", response_model=dict)
async def add_to_queue(
    agent_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    queue_id = f"q_{uuid.uuid4().hex[:8]}"
    item = {
        "id": queue_id,
        "content": data.get("content", ""),
        "channel": data.get("channel", "web"),
        "chat_id": data.get("chat_id", current_user.user_id),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    queue = _load_queue(agent_id)
    queue.append(item)
    _save_queue(agent_id, queue)

    return item


@router.delete("/{agent_id}/queue/{queue_id}", response_model=dict)
async def remove_from_queue(
    agent_id: str,
    queue_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    queue = _load_queue(agent_id)
    original_len = len(queue)
    queue = [item for item in queue if item.get("id") != queue_id]

    if len(queue) == original_len:
        raise HTTPException(status_code=404, detail="Queue item not found")

    _save_queue(agent_id, queue)

    return {"id": queue_id, "deleted": True}
