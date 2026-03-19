"""Message API routes."""

import json

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["messages"])


@router.get("/{agent_id}/messages", response_model=dict)
async def list_messages(
    agent_id: str,
    channel: str | None = None,
    chat_key: str | None = None,
    session_key: str | None = None,
    limit: int = 50,
    before: str | None = None,
    current_user: User = Depends(get_current_user),
) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    sessions_dir = agent_config.workspace / "sessions"
    if not sessions_dir.exists():
        return {"messages": [], "pagination": {"has_more": False}}

    messages = []
    for session_file in sessions_dir.glob("*.jsonl"):
        if session_key and session_file.stem != session_key:
            continue

        with open(session_file, encoding="utf-8") as f:
            for line in f:
                try:
                    msg = json.loads(line.strip())
                    if msg.get("_type") == "metadata":
                        continue
                    source = msg.get("_source", {})
                    msg_channel = msg.get("channel") or source.get("channel")
                    msg_chat_key = source.get("chat_key")

                    if channel and msg_channel != channel:
                        continue
                    if chat_key and msg_chat_key != chat_key:
                        continue
                    if before and msg.get("timestamp", "") >= before:
                        continue
                    messages.append(
                        {
                            "id": msg.get("id", ""),
                            "role": msg.get("role", ""),
                            "content": msg.get("content", ""),
                            "timestamp": msg.get("timestamp"),
                            "channel": msg_channel,
                            "chat_key": msg_chat_key,
                            "tool_calls": msg.get("tool_calls"),
                        }
                    )
                except json.JSONDecodeError:
                    continue

    messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    messages = messages[:limit]

    return {
        "messages": messages,
        "pagination": {"has_more": len(messages) == limit},
    }
