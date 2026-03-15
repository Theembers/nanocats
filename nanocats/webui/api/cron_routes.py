"""Cron API routes."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["cron"])


@router.get("/{agent_id}/cron", response_model=dict)
async def list_cron(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    cron_file = agent_config.workspace / "cron" / "jobs.json"
    if not cron_file.exists():
        return {"jobs": []}

    with open(cron_file, encoding="utf-8") as f:
        cron_data = json.load(f)

    jobs = cron_data.get("jobs", [])
    return {"jobs": jobs}


@router.post("/{agent_id}/cron", response_model=dict)
async def create_cron(
    agent_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    job_id = f"job_{uuid.uuid4().hex[:6]}"
    name = data.get("name", "Unnamed Job")
    enabled = data.get("enabled", True)
    schedule = data.get("schedule", {"kind": "cron", "expr": "0 * * * *", "tz": "UTC"})
    payload = data.get(
        "payload", {"kind": "system_event", "message": "", "deliver": True, "channel": "web"}
    )

    cron_file = agent_config.workspace / "cron" / "jobs.json"
    cron_file.parent.mkdir(parents=True, exist_ok=True)

    if cron_file.exists():
        with open(cron_file, encoding="utf-8") as f:
            cron_data = json.load(f)
    else:
        cron_data = {"jobs": []}

    job = {
        "id": job_id,
        "name": name,
        "enabled": enabled,
        "schedule": schedule,
        "payload": payload,
    }
    cron_data["jobs"].append(job)

    with open(cron_file, "w", encoding="utf-8") as f:
        json.dump(cron_data, f, indent=2, ensure_ascii=False)

    return job


@router.put("/{agent_id}/cron/{job_id}", response_model=dict)
async def update_cron(
    agent_id: str,
    job_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    cron_file = agent_config.workspace / "cron" / "jobs.json"
    if not cron_file.exists():
        raise HTTPException(status_code=404, detail="Cron job not found")

    with open(cron_file, encoding="utf-8") as f:
        cron_data = json.load(f)

    job = None
    for j in cron_data.get("jobs", []):
        if j.get("id") == job_id:
            job = j
            break

    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found")

    if "name" in data:
        job["name"] = data["name"]
    if "enabled" in data:
        job["enabled"] = data["enabled"]
    if "schedule" in data:
        job["schedule"] = data["schedule"]
    if "payload" in data:
        job["payload"] = data["payload"]

    with open(cron_file, "w", encoding="utf-8") as f:
        json.dump(cron_data, f, indent=2, ensure_ascii=False)

    return job


@router.delete("/{agent_id}/cron/{job_id}", response_model=dict)
async def delete_cron(
    agent_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    if is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    cron_file = agent_config.workspace / "cron" / "jobs.json"
    if not cron_file.exists():
        raise HTTPException(status_code=404, detail="Cron job not found")

    with open(cron_file, encoding="utf-8") as f:
        cron_data = json.load(f)

    jobs = [j for j in cron_data.get("jobs", []) if j.get("id") != job_id]

    if len(jobs) == len(cron_data.get("jobs", [])):
        raise HTTPException(status_code=404, detail="Cron job not found")

    cron_data["jobs"] = jobs

    with open(cron_file, "w", encoding="utf-8") as f:
        json.dump(cron_data, f, indent=2, ensure_ascii=False)

    return {"id": job_id, "deleted": True}
