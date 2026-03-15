"""Agent API routes."""

import json

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.config.schema import AgentConfig, AgentType
from nanocats.session.manager import SessionManager
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user

router = APIRouter(prefix="/agents", tags=["agents"])


def _get_static_sessions(agent_config: AgentConfig) -> list[dict]:
    sessions = []
    agent_type = agent_config.type

    if agent_type == AgentType.ADMIN:
        sessions.append({"key": "global", "type": "static"})
    elif agent_type == AgentType.SPECIALIZED:
        sessions.append({"key": f"agent:{agent_config.id}", "type": "static"})
    elif agent_type == AgentType.TASK:
        sessions.append({"key": f"task:{agent_config.id}", "type": "static"})
    elif agent_type == AgentType.USER:
        group_ids = set()
        for sg in agent_config.channels.session_groups:
            group_ids.add(sg.group_id)
        group_ids.add("default")

        for group_id in sorted(group_ids):
            sessions.append({"key": f"user:{group_id}", "type": "static", "group_id": group_id})

    return sessions


def _get_dynamic_sessions(agent_config: AgentConfig) -> list[dict]:
    try:
        session_manager = SessionManager(agent_config.workspace)
        raw_sessions = session_manager.list_sessions()

        sessions = []
        for s in raw_sessions:
            sessions.append(
                {
                    "key": s.get("key", ""),
                    "type": "dynamic",
                    "created_at": s.get("created_at"),
                    "updated_at": s.get("updated_at"),
                }
            )
        return sessions
    except Exception:
        return []


def _has_access(user: User, agent_config: AgentConfig) -> bool:
    if is_admin_user(user):
        return True
    for ch_config in agent_config.channels.configs.values():
        if ch_config.enabled and (
            user.user_id in ch_config.allow_from or "*" in ch_config.allow_from
        ):
            return True
    return False


@router.get("", response_model=dict)
async def list_agents(current_user: User = Depends(get_current_user)) -> dict:
    all_agents = AgentConfigLoader.load_all()
    accessible = []

    for agent_id, agent_config in all_agents.items():
        if is_admin_user(current_user):
            accessible_channels = list(agent_config.channels.configs.keys())
            allow_from = []
            for ch in agent_config.channels.configs.values():
                allow_from.extend(ch.allow_from)
            accessible.append(
                {
                    "id": agent_id,
                    "name": agent_config.name,
                    "type": agent_config.type.value,
                    "model": agent_config.model,
                    "provider": agent_config.provider,
                    "workspace": str(agent_config.workspace),
                    "accessible_channels": accessible_channels,
                    "allow_from": allow_from,
                }
            )
        else:
            for ch_name, ch_config in agent_config.channels.configs.items():
                if ch_config.enabled and (
                    current_user.user_id in ch_config.allow_from or "*" in ch_config.allow_from
                ):
                    accessible_channels = [ch_name]
                    allow_from = ch_config.allow_from
                    accessible.append(
                        {
                            "id": agent_id,
                            "name": agent_config.name,
                            "type": agent_config.type.value,
                            "model": agent_config.model,
                            "provider": agent_config.provider,
                            "workspace": str(agent_config.workspace),
                            "accessible_channels": accessible_channels,
                            "allow_from": allow_from,
                        }
                    )
                    break

    return {"agents": accessible}


@router.get("/{agent_id}", response_model=dict)
async def get_agent(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    static_sessions = _get_static_sessions(agent_config)
    dynamic_sessions = _get_dynamic_sessions(agent_config)

    all_session_keys = {s["key"] for s in static_sessions} | {s["key"] for s in dynamic_sessions}
    merged_sessions = []

    for s in static_sessions:
        merged_sessions.append(s)

    for s in dynamic_sessions:
        if s["key"] not in all_session_keys:
            merged_sessions.append(s)
            all_session_keys.add(s["key"])

    return {
        "id": agent_config.id,
        "name": agent_config.name,
        "type": agent_config.type.value,
        "model": agent_config.model,
        "provider": agent_config.provider,
        "auto_start": agent_config.auto_start,
        "channels": {
            "configs": {
                name: {"enabled": cfg.enabled, "allowFrom": cfg.allow_from, "extra": cfg.extra}
                for name, cfg in agent_config.channels.configs.items()
            }
        },
        "sessions": merged_sessions,
    }


@router.patch("/{agent_id}", response_model=dict)
async def update_agent(
    agent_id: str,
    updates: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    config_path = AgentConfigLoader.get_agents_dir() / f"{agent_id}.json"

    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)

    if "name" in updates:
        data["name"] = updates["name"]
    if "model" in updates:
        data["model"] = updates["model"]
    if "provider" in updates:
        data["provider"] = updates["provider"]
    if "autoStart" in updates:
        data["autoStart"] = updates["autoStart"]

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return await get_agent(agent_id, current_user)
