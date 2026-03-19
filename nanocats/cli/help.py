"""Help command implementation."""

import typer
from rich.console import Console

from nanocats import __logo__
from nanocats.cli._app import app

console = Console()


@app.command()
def help(
    command: str | None = typer.Argument(None, help="Command to get help for"),
):
    """Show help information for nanocats commands."""
    if command:
        _show_command_help(command)
    else:
        _show_all_commands()


def _show_all_commands():
    """Display all available commands."""
    console.print(f"\n[bold cyan]{__logo__} nanocats CLI Help[/bold cyan]\n")

    console.print("[bold]Main Commands:[/bold]")
    console.print("  [green]onboard[/green]          Initialize config and workspace")
    console.print("  [green]gateway[/green]           Start Gateway service")
    console.print("  [green]status[/green]            Show system status")
    console.print("  [green]help[/green] [command]   Show help information\n")

    console.print("[bold]Sub Commands:[/bold]")
    console.print("  [green]swarm status[/green]      Show Swarm status and list agents")
    console.print("  [green]swarm create[/green]     Create new Agent")
    console.print("  [green]channels status[/green]   Show channel status")
    console.print("  [green]channels login[/green]   WhatsApp device login")
    console.print("  [green]provider login[/green]    OAuth login\n")

    console.print('[dim]Use "nanocats help <command>" for detailed command usage[/dim]\n')


def _show_command_help(command: str):
    """Display detailed help for a specific command."""
    help_map = {
        "onboard": {
            "desc": "Initialize nanocats configuration and workspace",
            "usage": "nanocats onboard",
            "options": [],
        },
        "gateway": {
            "desc": "Start Gateway service (Swarm mode)",
            "usage": "nanocats gateway [OPTIONS]",
            "options": [
                ("-p, --port", "Gateway port"),
                ("-c, --config", "Config file path"),
                ("-v, --verbose", "Enable debug logging"),
            ],
        },
        "status": {
            "desc": "Show nanocats system status",
            "usage": "nanocats status",
            "options": [],
        },
        "swarm": {
            "desc": "Swarm management commands",
            "usage": "nanocats swarm <subcommand>",
            "options": [
                ("status", "Show Swarm status and list agents"),
                ("create <id>", "Create new Agent"),
            ],
        },
        "channels": {
            "desc": "Channel management commands",
            "usage": "nanocats channels <subcommand>",
            "options": [
                ("status", "Show channel status"),
                ("login", "WhatsApp device login (QR scan)"),
            ],
        },
        "provider": {
            "desc": "OAuth provider login",
            "usage": "nanocats provider login <provider>",
            "options": [
                ("openai-codex", "OpenAI Codex OAuth login"),
                ("github-copilot", "GitHub Copilot OAuth login"),
            ],
        },
    }

    if command not in help_map:
        console.print(f"[red]Unknown command: {command}[/red]")
        console.print("\nUse [cyan]nanocats help[/cyan] to see all available commands")
        raise typer.Exit(1)

    info = help_map[command]
    console.print(f"\n[bold cyan]{__logo__} nanocats help {command}[/bold cyan]\n")
    console.print(f"[bold]Description:[/bold] {info['desc']}\n")
    console.print(f"[bold]Usage:[/bold] [green]{info['usage']}[/green]\n")

    if info["options"]:
        console.print("[bold]Options/Subcommands:[/bold]")
        for opt, desc in info["options"]:
            console.print(f"  [green]{opt:<18}[/green] {desc}")
        console.print()
