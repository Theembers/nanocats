"""Shared app instance - imported by all CLI submodules to avoid circular imports."""

import os
import sys

import typer
from rich.console import Console

from nanocats import __logo__, __version__

app = typer.Typer(
    name="nanocats",
    help=f"{__logo__} nanocats - Personal AI Assistant",
    no_args_is_help=True,
)

console = Console()


def version_callback(value: bool):
    if value:
        console.print(f"{__logo__} nanocats v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(None, "--version", "-v", callback=version_callback, is_eager=True),
):
    """nanocats - Personal AI Assistant."""
    pass


if sys.platform == "win32":
    if sys.stdout.encoding != "utf-8":
        os.environ["PYTHONIOENCODING"] = "utf-8"
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
