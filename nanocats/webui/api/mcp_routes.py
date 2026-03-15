"""MCP API routes."""

import json

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["mcp"])


@router.get("/{agent_id}/mcp", response_model=dict)
async def list_mcp(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    config_path = AgentConfigLoader.get_agents_dir() / f"{agent_id}.json"

    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)

    tools_config = data.get("tools", {})
    mcp_servers = tools_config.get("mcpServers", {})

    return {"servers": mcp_servers}


@router.post("/{agent_id}/mcp", response_model=dict)
async def create_mcp(
    agent_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    name = data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="MCP server name is required")

    config_path = AgentConfigLoader.get_agents_dir() / f"{agent_id}.json"

    with open(config_path, encoding="utf-8") as f:
        config_data = json.load(f)

    if "tools" not in config_data:
        config_data["tools"] = {}
    if "mcpServers" not in config_data["tools"]:
        config_data["tools"]["mcpServers"] = {}

    server_config = {
        "type": data.get("type"),
        "command": data.get("command"),
        "args": data.get("args", []),
        "env": data.get("env", {}),
        "url": data.get("url"),
        "headers": data.get("headers", {}),
        "toolTimeout": data.get("tool_timeout", 30),
    }
    server_config = {k: v for k, v in server_config.items() if v is not None}

    config_data["tools"]["mcpServers"][name] = server_config

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)

    return {"name": name, **server_config}


@router.delete("/{agent_id}/mcp/{server_name}", response_model=dict)
async def delete_mcp(
    agent_id: str,
    server_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    if is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    config_path = AgentConfigLoader.get_agents_dir() / f"{agent_id}.json"

    with open(config_path, encoding="utf-8") as f:
        config_data = json.load(f)

    mcp_servers = config_data.get("tools", {}).get("mcpServers", {})
    if server_name not in mcp_servers:
        raise HTTPException(status_code=404, detail="MCP server not found")

    del config_data["tools"]["mcpServers"][server_name]

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)

    return {"name": server_name, "deleted": True}
