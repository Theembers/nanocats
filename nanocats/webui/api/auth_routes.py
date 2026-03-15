"""Authentication API routes."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException

from nanocats.webui import auth
from nanocats.webui.models import LoginRequest, LoginResponse, User, UserCreate
from nanocats.webui.api.helpers import get_current_user, is_admin_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    user_data = auth.authenticate_user(request.user_id, request.password)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    auth.update_last_login(user_data["user_id"])

    secret_key = auth.get_jwt_secret()
    token = auth.create_access_token(
        {"sub": user_data["user_id"], "name": user_data["name"], "role": user_data["role"]},
        secret_key,
        timedelta(hours=168),
    )

    return LoginResponse(
        token=token,
        user=User(
            user_id=user_data["user_id"],
            name=user_data["name"],
            role=user_data["role"],
            created_at=user_data.get("created_at"),
            last_login=user_data.get("last_login"),
        ),
    )


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
) -> User:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        new_user = auth.create_user(user_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return User(
        user_id=new_user["user_id"],
        name=new_user["name"],
        role=new_user["role"],
        created_at=new_user.get("created_at"),
        last_login=new_user.get("last_login"),
    )
