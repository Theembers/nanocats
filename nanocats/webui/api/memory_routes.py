"""Memory API routes."""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["memory"])


@router.get("/{agent_id}/memory", response_model=dict)
async def get_memory(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    memory_dir = agent_config.workspace / "memory"
    memory_file = memory_dir / "MEMORY.md"
    history_file = memory_dir / "HISTORY.md"

    result = {}
    if memory_file.exists():
        stat = os.stat(memory_file)
        result["memory"] = {
            "content": memory_file.read_text(encoding="utf-8"),
            "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }
    else:
        result["memory"] = None

    if history_file.exists():
        stat = os.stat(history_file)
        result["history"] = {
            "content": history_file.read_text(encoding="utf-8"),
            "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }
    else:
        result["history"] = None

    return result


@router.put("/{agent_id}/memory", response_model=dict)
async def update_memory(
    agent_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    memory_dir = agent_config.workspace / "memory"
    memory_dir.mkdir(parents=True, exist_ok=True)

    content = data.get("content", "")
    memory_file = memory_dir / "MEMORY.md"
    memory_file.write_text(content, encoding="utf-8")

    stat = os.stat(memory_file)
    return {
        "memory": {
            "content": content,
            "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }
    }
