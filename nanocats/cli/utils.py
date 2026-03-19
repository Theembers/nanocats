"""Shared CLI utilities."""

from pathlib import Path
from typing import Any

import typer
from rich.console import Console

console = Console()


def _interactive_select(options: list[str], title: str = "", default: int = 0) -> int:
    """Present a numbered list of options and return the user's selection."""
    if not options:
        return 0

    if title:
        console.print(f"\n[bold]{title}[/bold]\n")

    for i, option in enumerate(options):
        console.print(f"  [{i + 1}] {option}")

    while True:
        try:
            choice = typer.prompt("Selection", type=int, default=default + 1)
            if 1 <= choice <= len(options):
                return choice - 1
            console.print(f"[red]Please enter 1-{len(options)}[/red]")
        except Exception:
            console.print(f"[red]Invalid. Enter 1-{len(options)}[/red]")


def _load_runtime_config(config: str | None = None):
    """Load config from file."""
    from nanocats.config.loader import load_config, set_config_path

    config_path = None
    if config:
        config_path = Path(config).expanduser().resolve()
        if not config_path.exists():
            console.print(f"[red]Error: Config file not found: {config_path}[/red]")
            raise typer.Exit(1)
        set_config_path(config_path)
        console.print(f"[dim]Using config: {config_path}[/dim]")

    return load_config(config_path)


def _merge_missing_defaults(existing: Any, defaults: Any) -> Any:
    """Recursively fill in missing values from defaults without overwriting user config."""
    if not isinstance(existing, dict) or not isinstance(defaults, dict):
        return existing

    merged = dict(existing)
    for key, value in defaults.items():
        if key not in merged:
            merged[key] = value
        else:
            merged[key] = _merge_missing_defaults(merged[key], value)
    return merged


def _print_deprecated_memory_window_notice(config) -> None:
    """Warn when running with old memoryWindow-only config."""
    if config.agents.defaults.should_warn_deprecated_memory_window:
        console.print(
            "[yellow]Hint:[/yellow] Detected deprecated `memoryWindow` without "
            "`contextWindowTokens`. `memoryWindow` is ignored; run "
            "[cyan]nanocats onboard[/cyan] to refresh your config template."
        )
