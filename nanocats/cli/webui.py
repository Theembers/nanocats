"""WebUI server and user management commands."""

import typer
from rich.console import Console
from rich.table import Table

from nanocats import __logo__
from nanocats.cli._app import app
from nanocats.cli.utils import _load_runtime_config

console = Console()


@app.command()
def webui(
    port: int | None = typer.Option(None, "--port", "-p", help="WebUI server port"),
    host: str | None = typer.Option(None, "--host", help="WebUI server host"),
    config: str | None = typer.Option(None, "--config", "-c", help="Path to config file"),
):
    """Start the nanocats WebUI API server."""
    import uvicorn
    from nanocats.webui.app import app as webui_app

    config = _load_runtime_config(config)

    web_config = config.web
    bind_port = port if port is not None else web_config.port
    bind_host = host if host is not None else web_config.host

    console.print(f"{__logo__} Starting nanocats WebUI API on {bind_host}:{bind_port}...")

    uvicorn.run(webui_app, host=bind_host, port=bind_port)


@app.command()
def user_create(
    user_id: str = typer.Argument(..., help="User ID"),
    password: str = typer.Argument(..., help="Password"),
    name: str = typer.Option(..., "--name", "-n", help="Display name"),
):
    """Create a new WebUI user."""
    from nanocats.webui.auth import create_user
    from nanocats.webui.models import UserCreate

    try:
        user_data = UserCreate(user_id=user_id, password=password, name=name or user_id)
        new_user = create_user(user_data)
        console.print(
            f"[green]User created successfully:[/green] {new_user['user_id']} ({new_user['name']})"
        )
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)


@app.command()
def user_list():
    """List all WebUI users."""
    from nanocats.webui.auth import list_users

    users = list_users()
    if not users:
        console.print("[yellow]No users found[/yellow]")
        return

    table = Table(title="WebUI Users")
    table.add_column("User ID", style="cyan")
    table.add_column("Name", style="green")
    table.add_column("Created", style="blue")

    for user in users:
        table.add_row(
            user["user_id"],
            user["name"],
            user.get("created_at", "N/A")[:10] if user.get("created_at") else "N/A",
        )

    console.print(table)
