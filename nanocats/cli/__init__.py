"""CLI module for nanocats - entry point and command registration."""

from nanocats.cli._app import app, console, main

import typer

from nanocats.cli.help import help as help_cmd
from nanocats.cli.onboard import onboard
from nanocats.cli.gateway import gateway
from nanocats.cli.restart import restart
from nanocats.cli.swarm import swarm_app
from nanocats.cli.channels import channels_app
from nanocats.cli.plugins import plugins_app
from nanocats.cli.status import status
from nanocats.cli.oauth import provider_app
from nanocats.cli.webui import webui, user_create, user_list

app.add_typer(swarm_app, name="swarm")
app.add_typer(channels_app, name="channels")
app.add_typer(plugins_app, name="plugins")
app.add_typer(provider_app, name="provider")

app.command(name="help")(help_cmd)
app.command(name="restart")(restart)

if __name__ == "__main__":
    app()
