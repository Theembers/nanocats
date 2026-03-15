"""Skill API routes."""

import shutil

from fastapi import APIRouter, Depends, HTTPException

from nanocats.agent.config import AgentConfigLoader
from nanocats.webui.models import User
from nanocats.webui.api.helpers import get_current_user, is_admin_user
from nanocats.webui.api.agent_routes import _has_access

router = APIRouter(prefix="/agents", tags=["skills"])

BUILTIN_SKILLS = [
    {"name": "github", "description": "GitHub operations", "path": "nanocats/skills/github"},
    {"name": "cron", "description": "Cron job management", "path": "nanocats/skills/cron"},
    {"name": "memory", "description": "Memory management", "path": "nanocats/skills/memory"},
]


@router.get("/{agent_id}/skills", response_model=dict)
async def list_skills(agent_id: str, current_user: User = Depends(get_current_user)) -> dict:
    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not _has_access(current_user, agent_config):
        raise HTTPException(status_code=403, detail="Access denied")

    workspace_skills = []
    skills_dir = agent_config.workspace / "skills"
    if skills_dir.exists():
        for skill_path in skills_dir.iterdir():
            if skill_path.is_dir() and (skill_path / "SKILL.md").exists():
                content = (skill_path / "SKILL.md").read_text(encoding="utf-8")
                desc = ""
                for line in content.split("\n"):
                    if line.startswith("## "):
                        desc = line.replace("## ", "").strip()
                        break
                    if line.startswith("# "):
                        desc = line.replace("# ", "").strip()
                        break
                workspace_skills.append(
                    {
                        "name": skill_path.name,
                        "description": desc,
                        "path": str(skill_path),
                        "enabled": True,
                    }
                )

    return {"builtin": BUILTIN_SKILLS, "workspace": workspace_skills}


@router.post("/{agent_id}/skills", response_model=dict)
async def create_skill(
    agent_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    name = data.get("name")
    description = data.get("description", "")
    content = data.get("content", "")

    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")

    skills_dir = agent_config.workspace / "skills" / name
    skills_dir.mkdir(parents=True, exist_ok=True)
    (skills_dir / "SKILL.md").write_text(content, encoding="utf-8")

    return {
        "name": name,
        "description": description,
        "path": str(skills_dir),
        "enabled": True,
    }


@router.delete("/{agent_id}/skills/{skill_name}", response_model=dict)
async def delete_skill(
    agent_id: str,
    skill_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    agent_config = AgentConfigLoader.load(agent_id)
    if not agent_config:
        raise HTTPException(status_code=404, detail="Agent not found")

    skills_dir = agent_config.workspace / "skills" / skill_name
    if not skills_dir.exists():
        raise HTTPException(status_code=404, detail="Skill not found")

    shutil.rmtree(skills_dir)

    return {"name": skill_name, "deleted": True}
