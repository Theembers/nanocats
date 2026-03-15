"""Channel API routes."""

import json

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["channels"])

CHANNEL_NAMES = {
    "telegram": "Telegram",
    "discord": "Discord",
    "feishu": "Feishu",
    "slack": "Slack",
    "whatsapp": "WhatsApp",
    "dingtalk": "DingTalk",
    "qq": "QQ",
    "email": "Email",
    "web": "Web UI",
    "matrix": "Matrix",
    "wecom": "WeCom",
    "mochat": "MoChat",
}


@router.get("/{agent_id}/channels", response_model=dict)
async def list_channels(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    channels = []
    for ch_name, ch_config in agent_config.channels.configs.items():
        channels.append(
            {
                "name": ch_name,
                "enabled": ch_config.enabled,
                "display_name": CHANNEL_NAMES.get(ch_name, ch_name.title()),
            }
        )

    return {"channels": channels}


@router.patch("/{agent_id}/channels/{channel_name}", response_model=dict)
async def update_channel(
    agent_id: str,
    channel_name: str,
    updates: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if channel_name not in agent_config.channels.configs:
        raise HTTPException(status_code=404, detail="Channel not found")

    config_path = AgentConfigLoader.get_agents_dir() / f"{agent_id}.json"

    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)

    if "channels" not in data:
        data["channels"] = {}
    if "configs" not in data["channels"]:
        data["channels"]["configs"] = {}
    if channel_name not in data["channels"]["configs"]:
        data["channels"]["configs"][channel_name] = {}

    if "enabled" in updates:
        data["channels"]["configs"][channel_name]["enabled"] = updates["enabled"]

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return {
        "name": channel_name,
        "enabled": data["channels"]["configs"][channel_name].get("enabled", False),
        "display_name": CHANNEL_NAMES.get(channel_name, channel_name.title()),
    }
