"""Swarm management commands."""

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from nanocats import __logo__

console = Console()

swarm_app = typer.Typer(help="Manage agent swarm")


def _create_agent_config(
    agent_id: str,
    name: str,
    agent_type: str,
    model: str | None = None,
) -> dict:
    """Create agent config dict using defaults from config.json."""
    from nanocats.config.loader import load_config
    from nanocats.config.schema import AgentType

    config = load_config()
    default_provider = config.agents.defaults.provider
    default_model = config.agents.defaults.model

    provider = default_provider
    final_model = default_model

    if model:
        if "/" in model:
            provider, final_model = model.split("/", 1)
        else:
            final_model = model

    session_policy_map = {
        "user": "per_user",
        "admin": "global",
        "specialized": "per_channel",
        "task": "per_task",
    }

    agent_data = {
        "id": agent_id,
        "name": name or agent_id,
        "type": agent_type,
        "sessionPolicy": session_policy_map.get(agent_type, "per_user"),
        "model": final_model,
        "provider": provider,
        "autoStart": True,
        "channels": {"configs": {"web": {"enabled": True, "allowFrom": ["*"]}}},
    }

    return agent_data


@swarm_app.command("status")
def swarm_status():
    """Show swarm status and list all configured agents."""
    from nanocats.config.loader import load_config

    config = load_config()

    console.print(f"{__logo__} Swarm Status\n")

    agents_dir = Path.home() / ".nanocats" / "agents"

    has_swarm_config = hasattr(config.agents, "swarm") and config.agents.swarm is not None
    if has_swarm_config:
        if hasattr(config.agents.swarm, "max_agents"):
            console.print(f"Max agents: {config.agents.swarm.max_agents}")
    console.print(f"Agents dir: {agents_dir}")

    if not agents_dir.exists():
        console.print("\n[yellow]No agents configured.[/yellow]")
        console.print("Create agent configs in ~/.nanocats/agents/")
        return

    agent_files = list(agents_dir.glob("*.json"))

    if agent_files:
        console.print(f"\n[green]Configured agents ({len(agent_files)}):[/green]")
        table = Table()
        table.add_column("ID", style="cyan")
        table.add_column("Name")
        table.add_column("Type")
        table.add_column("Auto-start")
        table.add_column("Channels")

        for path in sorted(agent_files):
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                agent_id = data.get("id", path.stem)
                name = data.get("name", "-")
                agent_type = data.get("type", "user")
                auto_start = "yes" if data.get("autoStart", True) else "no"
                configs = data.get("channels", {}).get("configs", {})
                channels = list(configs.keys()) if configs else []
                channels_str = ", ".join(channels) if channels else "-"
                table.add_row(agent_id, name, agent_type, auto_start, channels_str)
            except Exception:
                table.add_row(path.stem, "-", "-", "-", "-")

        console.print(table)
    else:
        console.print("\n[yellow]No agents configured.[/yellow]")
        console.print("Create agent configs in ~/.nanocats/agents/")


@swarm_app.command("create")
def swarm_create(
    agent_id: str = typer.Argument(..., help="Agent ID"),
    name: str = typer.Option("", "--name", "-n", help="Agent display name"),
    agent_type: str = typer.Option(
        "user", "--type", "-t", help="Agent type (admin, user, specialized, task)"
    ),
    model: str = typer.Option(
        "", "--model", "-m", help="Model to use (e.g., minimax/MiniMax-M2.5)"
    ),
):
    """Create a new agent configuration."""
    valid_types = {"admin", "user", "specialized", "task"}
    if agent_type not in valid_types:
        console.print(f"[red]Invalid agent type: {agent_type}[/red]")
        console.print(f"Valid types: {', '.join(valid_types)}")
        raise typer.Exit(1)

    agent_data = _create_agent_config(agent_id, name, agent_type, model)

    agents_dir = Path.home() / ".nanocats" / "agents"
    agents_dir.mkdir(parents=True, exist_ok=True)

    agent_config_path = agents_dir / f"{agent_id}.json"
    with open(agent_config_path, "w", encoding="utf-8") as f:
        json.dump(agent_data, f, indent=2, ensure_ascii=False)

    console.print(f"[green]✓[/green] Created agent config: {agent_config_path}")
    console.print(f"  Type: {agent_type}")
    console.print(f"  Model: {agent_data['model']}")
    console.print(f"  Provider: {agent_data['provider']}")
    console.print("Edit the file to configure channels, MCP, skills, etc.")
