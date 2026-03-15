"""Avatar parsing utilities for Agent and User avatars."""

import re
from pathlib import Path
from typing import Optional


DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=nanocats"


def parse_agent_avatar(soul_path: Path) -> str:
    """
    Parse avatar URL from SOUL.md file.

    Looks for ## Avatar section and extracts image URL.
    Returns default avatar if not found.
    """
    if not soul_path.exists():
        return DEFAULT_AVATAR

    try:
        content = soul_path.read_text(encoding="utf-8")
    except Exception:
        return DEFAULT_AVATAR

    avatar_pattern = r"##\s*Avatar\s*\n.*?!\[[^\]]*\]\(([^)]+)\)"
    match = re.search(avatar_pattern, content, re.IGNORECASE | re.DOTALL)

    if match:
        return match.group(1).strip()

    generic_img_pattern = r"!\[avatar\]\(([^)]+)\)"
    match = re.search(generic_img_pattern, content, re.IGNORECASE)

    if match:
        return match.group(1).strip()

    return DEFAULT_AVATAR


def parse_user_avatar(user_path: Path, user_name: Optional[str] = None) -> str:
    """
    Parse avatar URL from USER.md file.

    Looks for ## Basic Information or ## Avatar section.
    Generates initials avatar if not found.
    """
    if not user_path.exists():
        return generate_initials_avatar(user_name or "User")

    try:
        content = user_path.read_text(encoding="utf-8")
    except Exception:
        return generate_initials_avatar(user_name or "User")

    avatar_pattern = r"(?:##\s*(?:Avatar|Basic\s+Information)\s*\n.*?)!\[avatar\]\(([^)]+)\)"
    match = re.search(avatar_pattern, content, re.IGNORECASE | re.DOTALL)

    if match:
        return match.group(1).strip()

    generic_img_pattern = r"!\[avatar\]\(([^)]+)\)"
    match = re.search(generic_img_pattern, content, re.IGNORECASE)

    if match:
        return match.group(1).strip()

    return generate_initials_avatar(user_name or "User")


def generate_initials_avatar(name: str) -> str:
    """
    Generate a initials-based avatar URL.

    Uses dicebear API for initials generation.
    """
    clean_name = "".join(c for c in name if c.isalnum() or c in " -")
    initials = "".join(w[0].upper() for w in clean_name.split()[:2])
    if not initials:
        initials = "U"

    return f"https://api.dicebear.com/7.x/initials/svg?seed={initials}&backgroundColor=6366f1"


def get_agent_avatar(workspace: Path) -> str:
    """
    Get agent avatar from workspace SOUL.md.
    """
    soul_path = workspace / "SOUL.md"
    return parse_agent_avatar(soul_path)


def get_user_avatar(workspace: Path, user_id: str, user_name: Optional[str] = None) -> str:
    """
    Get user avatar from workspace USER.md.
    """
    user_path = workspace / "USER.md"
    return parse_user_avatar(user_path, user_name or user_id)
