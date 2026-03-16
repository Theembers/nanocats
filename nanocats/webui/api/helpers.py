"""Common helpers for WebUI API routes."""

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer

from nanocats.webui import auth
from nanocats.webui.models import User

security = HTTPBearer(auto_error=False)


def is_admin_user(user: User) -> bool:
    from nanocats.agent.config import AgentConfigLoader
    from nanocats.config.schema import AgentType

    all_agents = AgentConfigLoader.load_all()
    for agent_config in all_agents.values():
        if agent_config.type == AgentType.ADMIN:
            for ch_config in agent_config.channels.configs.values():
                if ch_config.enabled and (
                    user.user_id in ch_config.allow_from or "*" in ch_config.allow_from
                ):
                    return True

    return True


async def get_current_user(request: Request) -> User:
    credentials = await security(request)
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    secret_key = auth.get_jwt_secret()
    payload = auth.decode_token(token, secret_key)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user_data = auth.get_user(user_id)
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")

    return User(
        user_id=user_data["user_id"],
        name=user_data["name"],
        role=user_data.get("role", "user"),
        created_at=user_data.get("created_at"),
        last_login=user_data.get("last_login"),
    )


async def get_current_user_optional(request: Request) -> User | None:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def check_agent_access(user: User, agent_config: dict) -> bool:
    if is_admin_user(user):
        return True

    from nanocats.agent.config import AgentConfigLoader

    config = AgentConfigLoader.load(agent_config.get("id", ""))
    if not config:
        return False

    for ch_config in config.channels.configs.values():
        if ch_config.enabled and (
            user.user_id in ch_config.allow_from or "*" in ch_config.allow_from
        ):
            return True
    return False
