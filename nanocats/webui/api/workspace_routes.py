"""Workspace API routes."""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["workspace"])

VALID_FILES = ["SOUL.md", "TOOLS.md", "USER.md", "AGENTS.md", "HEARTBEAT.md"]


@router.get("/{agent_id}/workspace/{file}", response_model=dict)
async def get_workspace_file(
    agent_id: str,
    file: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if file not in VALID_FILES:
        raise HTTPException(status_code=400, detail="Invalid file")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    file_path = agent_config.workspace / file
    if not file_path.exists():
        return {"file": file, "content": "", "last_modified": None}

    stat = os.stat(file_path)
    last_modified = datetime.fromtimestamp(stat.st_mtime).isoformat()

    return {
        "file": file,
        "content": file_path.read_text(encoding="utf-8"),
        "last_modified": last_modified,
    }


@router.put("/{agent_id}/workspace/{file}", response_model=dict)
async def update_workspace_file(
    agent_id: str,
    file: str,
    updates: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if file not in VALID_FILES:
        raise HTTPException(status_code=400, detail="Invalid file")

    content = updates.get("content", "")
    file_path = agent_config.workspace / file
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")

    stat = os.stat(file_path)
    last_modified = datetime.fromtimestamp(stat.st_mtime).isoformat()

    return {"file": file, "content": content, "last_modified": last_modified}
