"""Session API routes."""

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["sessions"])


def _parse_session_key(session_key: str) -> dict:
    """Parse session key to extract components.

    Format: {agentType}-{agentId}-{groupId}
    Example: user-Bro-personal
    """
    parts = session_key.split("-")
    if len(parts) >= 3:
        return {
            "agent_type": parts[0],
            "agent_id": parts[1],
            "group_id": "-".join(parts[2:]),
        }
    return {"agent_type": None, "agent_id": None, "group_id": None}


def _get_session_chat_keys(session_path: Path) -> list[str]:
    """Extract unique chatKeys from a session file.

    Scans messages for _source.chat_key field.

    Returns:
        List of chatKeys, e.g. ["feishu:bro", "web:default"]
    """
    chat_keys: set[str] = set()

    try:
        with open(session_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    data = json.loads(line)

                    if data.get("_type") == "metadata":
                        message_sources = data.get("message_sources", {})
                        for chat_key in message_sources.keys():
                            chat_keys.add(chat_key)
                    else:
                        source = data.get("_source", {})
                        chat_key = source.get("chat_key")
                        if chat_key:
                            chat_keys.add(chat_key)
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass

    return sorted(chat_keys)


@router.get("/{agent_id}/session-tree", response_model=dict)
async def get_session_tree(
    agent_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get session-channel tree structure for an agent.

    Returns all sessions for the agent with their associated chatKeys.
    """
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    sessions_dir = agent_config.workspace / "sessions"
    if not sessions_dir.exists():
        return {"sessions": []}

    sessions = []

    for session_path in sessions_dir.glob("*.jsonl"):
        try:
            with open(session_path, encoding="utf-8") as f:
                first_line = f.readline().strip()
                if not first_line:
                    continue

                data = json.loads(first_line)
                if data.get("_type") != "metadata":
                    continue

                session_key = data.get("key") or session_path.stem
                updated_at = data.get("updated_at")

            parsed = _parse_session_key(session_key)

            chat_keys = _get_session_chat_keys(session_path)

            sessions.append(
                {
                    "key": session_key,
                    "updated_at": updated_at,
                    "group_id": parsed.get("group_id"),
                    "chat_keys": chat_keys,
                }
            )
        except (json.JSONDecodeError, Exception):
            continue

    sessions.sort(key=lambda x: x.get("updated_at") or "", reverse=True)

    return {"sessions": sessions}
