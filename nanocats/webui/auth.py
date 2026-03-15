"""WebUI authentication and user management."""

import json
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from jose import JWTError, jwt
from loguru import logger
from passlib.context import CryptContext

from nanocats.webui.models import LoginRequest, LoginResponse, User, UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY_ALGORITHM = "HS256"

DATA_DIR = Path.home() / ".nanocats" / "data"
USERS_FILE = DATA_DIR / "users.json"


def _get_users_file() -> Path:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        USERS_FILE.write_text(json.dumps({"users": []}, indent=2))
    return USERS_FILE


def _load_users() -> list[dict[str, Any]]:
    with open(_get_users_file(), encoding="utf-8") as f:
        data = json.load(f)
    return data.get("users", [])


def _save_users(users: list[dict[str, Any]]) -> None:
    with open(_get_users_file(), "w", encoding="utf-8") as f:
        json.dump({"users": users}, f, indent=2, ensure_ascii=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    data: dict[str, Any], secret_key: str, expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=168)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=SECRET_KEY_ALGORITHM)
    return encoded_jwt


def decode_token(token: str, secret_key: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, secret_key, algorithms=[SECRET_KEY_ALGORITHM])
        return payload
    except JWTError:
        return None


def authenticate_user(user_id: str, password: str) -> dict[str, Any] | None:
    users = _load_users()
    for user in users:
        if user["user_id"] == user_id:
            if verify_password(password, user["password_hash"]):
                return user
    return None


def get_user(user_id: str) -> dict[str, Any] | None:
    users = _load_users()
    for user in users:
        if user["user_id"] == user_id:
            return user
    return None


def create_user(user_data: UserCreate) -> dict[str, Any]:
    users = _load_users()
    for user in users:
        if user["user_id"] == user_data.user_id:
            raise ValueError(f"User {user_data.user_id} already exists")

    now = datetime.utcnow().isoformat() + "Z"
    new_user = {
        "user_id": user_data.user_id,
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": now,
        "last_login": None,
    }
    users.append(new_user)
    _save_users(users)
    return new_user


def update_last_login(user_id: str) -> None:
    users = _load_users()
    for user in users:
        if user["user_id"] == user_id:
            user["last_login"] = datetime.utcnow().isoformat() + "Z"
            break
    _save_users(users)


def list_users() -> list[dict[str, Any]]:
    return _load_users()


def get_jwt_secret() -> str:
    from nanocats.config.loader import load_config

    config = load_config()
    web_config = getattr(config, "web", None)
    if web_config and getattr(web_config, "jwt_secret", None):
        return web_config.jwt_secret
    secret_file = DATA_DIR / ".jwt_secret"
    if secret_file.exists():
        return secret_file.read_text().strip()
    new_secret = secrets.token_urlsafe(32)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    secret_file.write_text(new_secret)
    return new_secret
