"""Session API routes."""

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["sessions"])


def _get_session_channels(session_path: Path) -> list[dict]:
    """Extract unique channels and their chat_ids from a session file.
    
    Reads the metadata line for message_sources, and also scans 
    messages for channel/chat_id fields as a fallback.
    
    Returns:
        List of dicts with format: [{"name": "feishu", "chat_ids": ["ou_xxx"]}]
    """
    channel_map: dict[str, set[str]] = {}
    
    def add_channel(ch: str, cid: str | None) -> None:
        if not ch:
            return
        if ch not in channel_map:
            channel_map[ch] = set()
        if cid:
            channel_map[ch].add(cid)
    
    try:
        with open(session_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    data = json.loads(line)
                    
                    # Check metadata line for message_sources
                    if data.get("_type") == "metadata":
                        message_sources = data.get("message_sources", {})
                        for ch, info in message_sources.items():
                            # info may contain chat_id or other details
                            cid = info.get("chat_id") if isinstance(info, dict) else None
                            add_channel(ch, cid)
                    else:
                        # Check individual message for channel/chat_id
                        source = data.get("_source", {})
                        ch = data.get("channel") or source.get("channel")
                        cid = data.get("chat_id") or source.get("chat_id")
                        add_channel(ch, cid)
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass
    
    return [{"name": ch, "chat_ids": sorted(ids)} for ch, ids in sorted(channel_map.items())]


@router.get("/{agent_id}/session-tree", response_model=dict)
async def get_session_tree(
    agent_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get session-channel tree structure for an agent.
    
    Returns all sessions for the agent with their associated channels.
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
            # Read metadata from first line
            with open(session_path, encoding="utf-8") as f:
                first_line = f.readline().strip()
                if not first_line:
                    continue
                    
                data = json.loads(first_line)
                if data.get("_type") != "metadata":
                    continue
                
                session_key = data.get("key") or session_path.stem.replace("_", ":", 1)
                updated_at = data.get("updated_at")
                
            # Get channels for this session
            channels = _get_session_channels(session_path)
            
            sessions.append({
                "key": session_key,
                "updated_at": updated_at,
                "channels": channels,
            })
        except (json.JSONDecodeError, Exception):
            continue

    # Sort by updated_at descending
    sessions.sort(key=lambda x: x.get("updated_at") or "", reverse=True)

    return {"sessions": sessions}
