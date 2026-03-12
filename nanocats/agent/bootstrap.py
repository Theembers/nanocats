"""Bootstrap state management for first-time user onboarding."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from importlib.resources import Traversable


def _get_template_content(filename: str) -> str:
    """Get template content from nanocats package."""
    from importlib.resources import files as pkg_files

    try:
        tpl = pkg_files("nanocats") / "templates"
        template_file = tpl / filename
        if template_file.is_file():
            return template_file.read_text(encoding="utf-8")
    except Exception:
        pass
    return ""


def should_run_bootstrap(workspace: Path) -> bool:
    """
    Determine if bootstrap (first-time onboarding) should run.

    Bootstrap runs only if ALL of these conditions are met:
    1. BOOTSTRAP.md exists in workspace
    2. USER.md is unchanged from template (or doesn't exist)
    3. SOUL.md Identity.Name is unchanged from template (or doesn't exist)

    This prevents repeated bootstrap for users who have already completed onboarding.
    """
    bootstrap_path = workspace / "BOOTSTRAP.md"
    if not bootstrap_path.exists():
        return False

    # Get template contents for comparison
    user_template = _get_template_content("USER.md")
    soul_template = _get_template_content("SOUL.md")

    # Check USER.md
    user_path = workspace / "USER.md"
    if user_path.exists():
        user_content = user_path.read_text(encoding="utf-8")
        # If user has edited (different from template), bootstrap already done
        if user_content.strip() != user_template.strip():
            return False
    else:
        # No USER.md means no bootstrap done yet, but we need template to compare
        if user_template:
            return False

    # Check SOUL.md Identity.Name
    soul_path = workspace / "SOUL.md"
    if soul_path.exists():
        soul_content = soul_path.read_text(encoding="utf-8")
        # Extract Identity.Name from template
        if "**Name**: nanocats" in soul_template:
            template_name = "**Name**: nanocats"
            # Check if name has been changed
            if template_name in soul_content:
                # Template name still present, check if it's been customized
                # by looking for other name patterns
                import re

                # If there's a different name defined, bootstrap was done
                name_pattern = r"\*\*Name\*\*:\s*(\S+)"
                matches = re.findall(name_pattern, soul_content)
                for match in matches:
                    if match and match != "nanocats":
                        return False
    else:
        # No SOUL.md means no bootstrap done yet, but we need template to compare
        if soul_template:
            return False

    # All checks passed - bootstrap should run
    return True
