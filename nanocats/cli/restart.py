"""Restart command for gateway."""

import os
import signal
import sys

import typer
from rich.console import Console

from nanocats import __logo__
from nanocats.cli._app import app

console = Console()


def _find_gateway_process() -> int | None:
    """Find the running gateway process PID."""
    import subprocess

    try:
        result = subprocess.run(
            ["pgrep", "-f", "nanocats gateway"],
            capture_output=True,
            text=True,
        )
        if result.stdout:
            pids = result.stdout.strip().split("\n")
            for pid in pids:
                try:
                    return int(pid)
                except ValueError:
                    continue
    except Exception:
        pass
    return None


def _is_gateway_running() -> bool:
    """Check if gateway is currently running."""
    pid = _find_gateway_process()
    if pid is None:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


@app.command()
def restart(
    port: int | None = typer.Option(None, "--port", "-p", help="Gateway port"),
    config: str | None = typer.Option(None, "--config", "-c", help="Path to config file"),
    force: bool = typer.Option(
        False, "--force", "-f", help="Force restart without graceful shutdown"
    ),
):
    """Restart the nanocats swarm gateway."""
    pid = _find_gateway_process()

    if pid is None:
        console.print("[yellow]Gateway is not running. Starting gateway instead...[/yellow]\n")
        cmd = [sys.executable, "-m", "nanocats", "gateway"]
        if port is not None:
            cmd.extend(["--port", str(port)])
        if config is not None:
            cmd.extend(["--config", config])
        os.execvp(sys.executable, cmd)
        return

    console.print(f"{__logo__} Restarting gateway (PID: {pid})...")

    if force:
        console.print("[yellow]Force restart - sending SIGKILL[/yellow]")
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError as e:
            console.print(f"[red]Failed to kill process: {e}[/red]")
            raise typer.Exit(1)
    else:
        console.print("[dim]Sending SIGTERM for graceful shutdown...[/dim]")
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError as e:
            console.print(f"[red]Failed to send signal: {e}[/red]")
            raise typer.Exit(1)

    console.print("[dim]Waiting for gateway to stop...[/dim]")
    import time

    for _ in range(60):
        time.sleep(0.5)
        if not _is_gateway_running():
            break
    else:
        console.print("[red]Gateway did not stop in time. Use --force to force kill.[/red]")
        raise typer.Exit(1)

    console.print("[green]✓[/green] Gateway stopped")

    console.print("[bold]🚀 Starting gateway...[/bold]\n")

    cmd = [sys.executable, "-m", "nanocats", "gateway"]
    if port is not None:
        cmd.extend(["--port", str(port)])
    if config is not None:
        cmd.extend(["--config", config])

    try:
        os.execvp(sys.executable, cmd)
    except OSError as e:
        console.print(f"[red]Failed to start gateway: {e}[/red]")
        raise typer.Exit(1)
