"""Status command."""

import typer
from rich.console import Console

from nanocats import __logo__
from nanocats.cli._app import app
from nanocats.config.loader import get_config_path, load_config
from nanocats.providers.registry import PROVIDERS

console = Console()


@app.command()
def status():
    """Show nanocats status."""
    config_path = get_config_path()
    config = load_config()

    console.print(f"{__logo__} nanocats Status\n")

    console.print(
        f"Config: {config_path} {'[green]✓[/green]' if config_path.exists() else '[red]✗[/red]'}"
    )

    if config_path.exists():
        console.print(f"Model: {config.agents.defaults.model}")

        for spec in PROVIDERS:
            p = getattr(config.providers, spec.name, None)
            if p is None:
                continue
            if spec.is_oauth:
                console.print(f"{spec.label}: [green]✓ (OAuth)[/green]")
            elif spec.is_local:
                if p.api_base:
                    console.print(f"{spec.label}: [green]✓ {p.api_base}[/green]")
                else:
                    console.print(f"{spec.label}: [dim]not set[/dim]")
            else:
                has_key = bool(p.api_key)
                console.print(
                    f"{spec.label}: {'[green]✓[/green]' if has_key else '[dim]not set[/dim]'}"
                )
