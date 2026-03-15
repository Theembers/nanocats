"""CLI commands for nanocats."""

import asyncio
import os
import select
import signal
import sys
from pathlib import Path
from typing import Any

# Force UTF-8 encoding for Windows console
if sys.platform == "win32":
    if sys.stdout.encoding != "utf-8":
        os.environ["PYTHONIOENCODING"] = "utf-8"
        # Re-open stdout/stderr with UTF-8 encoding
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

import typer
from prompt_toolkit import print_formatted_text
from prompt_toolkit import PromptSession
from prompt_toolkit.formatted_text import ANSI, HTML
from prompt_toolkit.history import FileHistory
from prompt_toolkit.patch_stdout import patch_stdout
from prompt_toolkit.application import run_in_terminal
from rich.console import Console
from rich.markdown import Markdown
from rich.table import Table
from rich.text import Text

from nanocats import __logo__, __version__
from nanocats.config.paths import get_workspace_path
from nanocats.config.schema import Config
from nanocats.utils.helpers import sync_workspace_templates

app = typer.Typer(
    name="nanocats",
    help=f"{__logo__} nanocats - Personal AI Assistant",
    no_args_is_help=True,
)

console = Console()
EXIT_COMMANDS = {"exit", "quit", "/exit", "/quit", ":q"}

# ---------------------------------------------------------------------------
# CLI input: prompt_toolkit for editing, paste, history, and display
# ---------------------------------------------------------------------------

_PROMPT_SESSION: PromptSession | None = None
_SAVED_TERM_ATTRS = None  # original termios settings, restored on exit


def _flush_pending_tty_input() -> None:
    """Drop unread keypresses typed while the model was generating output."""
    try:
        fd = sys.stdin.fileno()
        if not os.isatty(fd):
            return
    except Exception:
        return

    try:
        import termios

        termios.tcflush(fd, termios.TCIFLUSH)
        return
    except Exception:
        pass

    try:
        while True:
            ready, _, _ = select.select([fd], [], [], 0)
            if not ready:
                break
            if not os.read(fd, 4096):
                break
    except Exception:
        return


def _restore_terminal() -> None:
    """Restore terminal to its original state (echo, line buffering, etc.)."""
    if _SAVED_TERM_ATTRS is None:
        return
    try:
        import termios

        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, _SAVED_TERM_ATTRS)
    except Exception:
        pass


def _init_prompt_session() -> None:
    """Create the prompt_toolkit session with persistent file history."""
    global _PROMPT_SESSION, _SAVED_TERM_ATTRS

    # Save terminal state so we can restore it on exit
    try:
        import termios

        _SAVED_TERM_ATTRS = termios.tcgetattr(sys.stdin.fileno())
    except Exception:
        pass

    from nanocats.config.paths import get_cli_history_path

    history_file = get_cli_history_path()
    history_file.parent.mkdir(parents=True, exist_ok=True)

    _PROMPT_SESSION = PromptSession(
        history=FileHistory(str(history_file)),
        enable_open_in_editor=False,
        multiline=False,  # Enter submits (single line mode)
    )


def _make_console() -> Console:
    return Console(file=sys.stdout)


def _render_interactive_ansi(render_fn) -> str:
    """Render Rich output to ANSI so prompt_toolkit can print it safely."""
    ansi_console = Console(
        force_terminal=True,
        color_system=console.color_system or "standard",
        width=console.width,
    )
    with ansi_console.capture() as capture:
        render_fn(ansi_console)
    return capture.get()


def _print_agent_response(response: str, render_markdown: bool) -> None:
    """Render assistant response with consistent terminal styling."""
    console = _make_console()
    content = response or ""
    body = Markdown(content) if render_markdown else Text(content)
    console.print()
    console.print(f"[cyan]{__logo__} nanocats[/cyan]")
    console.print(body)
    console.print()


async def _print_interactive_line(text: str) -> None:
    """Print async interactive updates with prompt_toolkit-safe Rich styling."""

    def _write() -> None:
        ansi = _render_interactive_ansi(lambda c: c.print(f"  [dim]↳ {text}[/dim]"))
        print_formatted_text(ANSI(ansi), end="")

    await run_in_terminal(_write)


async def _print_interactive_response(response: str, render_markdown: bool) -> None:
    """Print async interactive replies with prompt_toolkit-safe Rich styling."""

    def _write() -> None:
        content = response or ""
        ansi = _render_interactive_ansi(
            lambda c: (
                c.print(),
                c.print(f"[cyan]{__logo__} nanocats[/cyan]"),
                c.print(Markdown(content) if render_markdown else Text(content)),
                c.print(),
            )
        )
        print_formatted_text(ANSI(ansi), end="")

    await run_in_terminal(_write)


def _is_exit_command(command: str) -> bool:
    """Return True when input should end interactive chat."""
    return command.lower() in EXIT_COMMANDS


async def _read_interactive_input_async() -> str:
    """Read user input using prompt_toolkit (handles paste, history, display).

    prompt_toolkit natively handles:
    - Multiline paste (bracketed paste mode)
    - History navigation (up/down arrows)
    - Clean display (no ghost characters or artifacts)
    """
    if _PROMPT_SESSION is None:
        raise RuntimeError("Call _init_prompt_session() first")
    try:
        with patch_stdout():
            return await _PROMPT_SESSION.prompt_async(
                HTML("<b fg='ansiblue'>You:</b> "),
            )
    except EOFError as exc:
        raise KeyboardInterrupt from exc


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


# ============================================================================
# Help Command
# ============================================================================


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

    # Main commands
    console.print("[bold]Main Commands:[/bold]")
    console.print("  [green]onboard[/green]          Initialize config and workspace")
    console.print("  [green]gateway[/green]           Start Gateway service")
    console.print("  [green]agent[/green]             Chat with agent")
    console.print("  [green]status[/green]            Show system status")
    console.print("  [green]help[/green] [command]   Show help information\n")

    # Sub commands
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
                ("-w, --workspace", "Workspace directory"),
                ("-c, --config", "Config file path"),
                ("-v, --verbose", "Enable debug logging"),
            ],
        },
        "agent": {
            "desc": "Chat with the agent",
            "usage": "nanocat s agent [OPTIONS]",
            "options": [
                ("-m, --message", "Message to send"),
                ("-s, --session", "Session ID (default: cli:direct)"),
                ("--markdown/--no-markdown", "Render output as Markdown"),
                ("--logs/--no-logs", "Show runtime logs"),
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


# ============================================================================
# Onboard / Setup
# ============================================================================


@app.command()
def onboard():
    """Interactive setup wizard for nanocats."""
    import json
    import secrets

    from nanocats.config.loader import get_config_path, load_config, save_config
    from nanocats.config.schema import Config
    from nanocats.providers.registry import PROVIDERS
    from nanocats.config.paths import get_workspace_path

    console.print(f"\n[bold cyan]{__logo__} Setup Wizard[/bold cyan]\n")
    console.print("[dim]This wizard will help you configure nanocats:\n[/dim]")
    console.print("  [yellow]1.[/yellow] Model provider configuration")
    console.print("  [yellow]2.[/yellow] Model selection")
    console.print("  [yellow]3.[/yellow] Master agent creation")
    console.print("  [yellow]4.[/yellow] Channel configuration\n")

    console.print("[bold cyan]━━━ Step 1/4: Model Provider ━━━[/bold cyan]\n")

    config_path = get_config_path()
    if config_path.exists():
        config = load_config()
        console.print(f"[dim]Using existing config: {config_path}[/dim]\n")
    else:
        config = Config()
        console.print(f"[dim]Creating new config: {config_path}[/dim]\n")

    provider_name = None
    api_key = None
    selected_model = None

    available_providers = []
    for spec in PROVIDERS:
        if spec.is_oauth:
            continue
        available_providers.append(spec)

    provider_options = [f"{p.label} ({p.name})" for p in available_providers]
    if config_path.exists():
        provider_options.insert(0, "Skip (use existing)")

    selected_idx = _interactive_select(provider_options, "Select a model provider:")

    provider_label = None

    if config_path.exists() and selected_idx == 0:
        provider_name = None
    elif not config_path.exists() or selected_idx > 0:
        selected_provider = available_providers[selected_idx - (1 if config_path.exists() else 0)]
        provider_name = selected_provider.name
        provider_label = selected_provider.label

        console.print(f"\n[green]✓[/green] Selected: [bold]{provider_label}[/bold]\n")

        existing_provider_key = None
        if config and hasattr(config, "providers") and config.providers:
            provider_key = provider_name.lower()
            for key in dir(config.providers):
                if key.startswith("_"):
                    continue
                if key.lower().replace("_", "") == provider_key.lower().replace("_", ""):
                    existing_provider_key = key
                    break

        if existing_provider_key:
            existing_api_key = getattr(config.providers, existing_provider_key, None)
            if existing_api_key and getattr(existing_api_key, "api_key", None):
                console.print(f"[dim]Found existing API key for {provider_label}[/dim]")
                use_existing = typer.confirm("Use existing API key?", default=True)
                if use_existing:
                    api_key = existing_api_key.api_key
                else:
                    console.print(f"\n[bold]🔐 Enter {provider_label} API key[/bold]")
                    api_key = typer.prompt("API Key", type=str, hide_input=True)
            else:
                console.print(f"\n[bold]🔐 Enter {provider_label} API key[/bold]")
                api_key = typer.prompt("API Key", type=str, hide_input=True)
        else:
            console.print(f"\n[bold]🔐 Enter {provider_label} API key[/bold]")
            api_key = typer.prompt("API Key", type=str, hide_input=True)

        console.print(f"\n[bold cyan]━━━ Step 2/4: Model Selection ━━━[/bold cyan]\n")

        models = selected_provider.recommended_models
        if models:
            model_options = [desc for _, desc in models]
            model_options.append("Custom (enter manually)")
            # Model Skip only makes sense when user kept existing provider AND config has a model
            model_has_existing = (
                config_path.exists()
                and config
                and config.agents
                and config.agents.defaults
                and config.agents.defaults.model
            )
            if model_has_existing:
                model_options.insert(0, "Skip (use existing)")

            selected_model_idx = _interactive_select(model_options, "Select a model:")

            if model_has_existing and selected_model_idx == 0:
                selected_model = config.agents.defaults.model
            elif selected_model_idx <= len(models):
                selected_model = models[selected_model_idx - (1 if model_has_existing else 0)][0]
            else:
                selected_model = typer.prompt("Enter custom model name")
        else:
            selected_model = typer.prompt("Enter model name")

        if selected_model:
            console.print(f"\n[green]✓[/green] Selected model: [bold]{selected_model}[/bold]\n")
    else:
        provider_name = None
        api_key = None
        selected_model = None
        if config:
            provider_name = config.agents.defaults.provider
            selected_model = config.agents.defaults.model
            console.print(f"\n[dim]Using existing: {provider_name} / {selected_model}[/dim]\n")

    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            config_data = json.load(f)
    else:
        config_data = {}

    if provider_name:
        config_data["agents"] = {
            "defaults": {
                "model": selected_model,
                "provider": provider_name,
            }
        }
    if provider_name and api_key:
        config_data["providers"] = config_data.get("providers", {})
        config_data["providers"][provider_name] = {
            "apiKey": api_key,
        }
    config_data["channels"] = config_data.get("channels", {})
    config_data["channels"]["web"] = config_data["channels"].get("web", {})
    config_data["channels"]["web"]["enabled"] = True

    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)

    console.print(f"\n[bold cyan]━━━ Step 3/4: Master Agent ━━━[/bold cyan]\n")

    admin_config_dir = Path.home() / ".nanocats" / "agents"
    has_existing_agent = admin_config_dir.exists() and list(admin_config_dir.glob("*.json"))

    if has_existing_agent:
        agent_options = [
            "Create new master agent",
            "Skip (use existing)",
        ]
        selected_agent_idx = _interactive_select(agent_options, "Create master agent?")
    else:
        selected_agent_idx = 0

    admin_config_path = None
    agent_id = None
    access_token = None

    if selected_agent_idx == 0:
        agent_id = typer.prompt("Agent ID", type=str, default="master", show_default=True)
        agent_name = typer.prompt("Agent Name", type=str, default="Master Agent", show_default=True)

        generated_token = secrets.token_urlsafe(16)
        console.print(f"\n[dim]Generated token: {generated_token}[/dim]")
        use_generated = typer.confirm("Use generated token?", default=True)

        if use_generated:
            access_token = generated_token
        else:
            access_token = typer.prompt("Enter custom token", hide_input=True)

        admin_config_dir = Path.home() / ".nanocats" / "agents"
        admin_config_dir.mkdir(parents=True, exist_ok=True)

        admin_agent_config = {
            "id": agent_id,
            "name": agent_name,
            "type": "supervisor",
            "autoStart": True,
            "model": selected_model,
            "provider": provider_name,
            "token": access_token,
            "channels": {"enabled": ["web"]},
        }

        admin_config_path = admin_config_dir / f"{agent_id}.json"
        with open(admin_config_path, "w", encoding="utf-8") as f:
            json.dump(admin_agent_config, f, indent=2, ensure_ascii=False)

        console.print(f"\n[green]✓[/green] Created agent: [bold]{agent_id}[/bold]\n")
    else:
        console.print(f"\n[dim]Skipped agent creation[/dim]\n")

    workspace = get_workspace_path()
    if not workspace.exists():
        workspace.mkdir(parents=True, exist_ok=True)
        console.print(f"[green]✓[/green] Created workspace at {workspace}")

    sync_workspace_templates(workspace)

    console.print(f"\n[bold cyan]━━━ Setup Complete ━━━[/bold cyan]\n")
    console.print(f"[bold]Configuration:[/bold]")
    console.print(f"  [dim]Config:[/dim] [cyan]{config_path}[/cyan]")
    console.print(f"  [dim]Workspace:[/dim] [cyan]{workspace}[/cyan]")
    console.print(f"\n[bold]Provider:[/bold]")
    console.print(f"  [dim]Name:[/dim] [green]{provider_label or 'existing'}[/green]")
    console.print(f"  [dim]Model:[/dim] [green]{selected_model or 'existing'}[/green]")

    if selected_agent_idx == 0:
        console.print(f"\n[bold]Master Agent:[/bold]")
        console.print(f"  [dim]ID:[/dim] [cyan]{agent_id}[/cyan]")
        console.print(f"  [dim]Token:[/dim] [yellow]{access_token}[/yellow]")

    console.print(f"\n[bold green]✓ Setup complete![/bold green]\n")
    console.print("[dim]Next steps:[/dim]")
    console.print("  [cyan]nanocats help[/cyan] - View all available commands")
    console.print("  [cyan]nanocats gateway[/cyan] - Start the gateway\n")


def _interactive_select(options: list[str], title: str = "", default: int = 0) -> int:
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


def _onboard_plugins(config_path: Path) -> None:
    """Inject default config for all discovered channels (built-in + plugins)."""
    import json

    from nanocats.channels.registry import discover_all

    all_channels = discover_all()
    if not all_channels:
        return

    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)

    channels = data.setdefault("channels", {})
    for name, cls in all_channels.items():
        if name not in channels:
            channels[name] = cls.default_config()
        else:
            channels[name] = _merge_missing_defaults(channels[name], cls.default_config())

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _make_provider(config: Config):
    """Create the appropriate LLM provider from config."""
    from nanocats.providers.base import GenerationSettings
    from nanocats.providers.openai_codex_provider import OpenAICodexProvider
    from nanocats.providers.azure_openai_provider import AzureOpenAIProvider
    from nanocats.providers.registry import find_by_name

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    p = config.get_provider(model)
    spec = find_by_name(provider_name) if provider_name else None

    # OpenAI Codex (OAuth)
    if provider_name == "openai_codex" or model.startswith("openai-codex/"):
        provider = OpenAICodexProvider(default_model=model)
    # Custom: direct OpenAI-compatible endpoint, bypasses LiteLLM
    elif provider_name == "custom":
        from nanocats.providers.custom_provider import CustomProvider

        provider = CustomProvider(
            api_key=p.api_key if p else "no-key",
            api_base=config.get_api_base(model) or "http://localhost:8000/v1",
            default_model=model,
        )
    # Azure OpenAI: direct Azure OpenAI endpoint with deployment name
    elif provider_name == "azure_openai":
        if not p or not p.api_key or not p.api_base:
            console.print("[red]Error: Azure OpenAI requires api_key and api_base.[/red]")
            console.print(
                "Set them in ~/.nanocats/config.json under providers.azure_openai section"
            )
            console.print("Use the model field to specify the deployment name.")
            raise typer.Exit(1)
        provider = AzureOpenAIProvider(
            api_key=p.api_key,
            api_base=p.api_base,
            default_model=model,
        )
    # OpenAI SDK compatible providers (excluding Azure/Anthropic)
    elif spec and spec.use_openai_sdk:
        from nanocats.providers.custom_provider import CustomProvider

        api_key = p.api_key if p else "no-key"
        api_base = config.get_api_base(model) or spec.default_api_base
        if not api_base:
            console.print(f"[red]Error: {provider_name} requires api_base configuration.[/red]")
            raise typer.Exit(1)
        provider = CustomProvider(
            api_key=api_key,
            api_base=api_base,
            default_model=model,
            supports_prompt_caching=spec.supports_prompt_caching,
        )
    else:
        from nanocats.providers.litellm_provider import LiteLLMProvider

        if (
            not model.startswith("bedrock/")
            and not (p and p.api_key)
            and not (spec and (spec.is_oauth or spec.is_local))
        ):
            console.print("[red]Error: No API key configured.[/red]")
            console.print("Set one in ~/.nanocats/config.json under providers section")
            raise typer.Exit(1)
        provider = LiteLLMProvider(
            api_key=p.api_key if p else None,
            api_base=config.get_api_base(model),
            default_model=model,
            extra_headers=p.extra_headers if p else None,
            provider_name=provider_name,
        )

    defaults = config.agents.defaults
    provider.generation = GenerationSettings(
        temperature=defaults.temperature,
        max_tokens=defaults.max_tokens,
        reasoning_effort=defaults.reasoning_effort,
    )
    return provider


def _load_runtime_config(config: str | None = None, workspace: str | None = None) -> Config:
    """Load config and optionally override the active workspace."""
    from nanocats.config.loader import load_config, set_config_path

    config_path = None
    if config:
        config_path = Path(config).expanduser().resolve()
        if not config_path.exists():
            console.print(f"[red]Error: Config file not found: {config_path}[/red]")
            raise typer.Exit(1)
        set_config_path(config_path)
        console.print(f"[dim]Using config: {config_path}[/dim]")

    loaded = load_config(config_path)
    if workspace:
        loaded.agents.defaults.workspace = workspace
    return loaded


def _print_deprecated_memory_window_notice(config: Config) -> None:
    """Warn when running with old memoryWindow-only config."""
    if config.agents.defaults.should_warn_deprecated_memory_window:
        console.print(
            "[yellow]Hint:[/yellow] Detected deprecated `memoryWindow` without "
            "`contextWindowTokens`. `memoryWindow` is ignored; run "
            "[cyan]nanocats onboard[/cyan] to refresh your config template."
        )


# ============================================================================
# Gateway / Server
# ============================================================================


@app.command()
def gateway(
    port: int | None = typer.Option(None, "--port", "-p", help="Gateway port"),
    workspace: str | None = typer.Option(None, "--workspace", "-w", help="Workspace directory"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose output"),
    config: str | None = typer.Option(None, "--config", "-c", help="Path to config file"),
):
    """Start the nanocats swarm gateway."""
    from nanocats.bus.queue import MessageBus
    from nanocats.channels.manager import ChannelManager
    from nanocats.config.paths import get_cron_dir
    from nanocats.cron.service import CronService
    from nanocats.cron.types import CronJob
    from nanocats.heartbeat.service import HeartbeatService
    from nanocats.swarm.manager import SwarmManager

    if verbose:
        import logging

        logging.basicConfig(level=logging.DEBUG)

    config = _load_runtime_config(config, workspace)
    _print_deprecated_memory_window_notice(config)
    port = port if port is not None else config.gateway.port

    console.print(f"{__logo__} Starting nanocats swarm gateway on port {port}...")
    sync_workspace_templates(config.workspace_path)
    bus = MessageBus()
    provider = _make_provider(config)

    swarm = SwarmManager(bus=bus, provider=provider)
    channel_manager = ChannelManager(config, bus, agent_registry=swarm.registry)

    cron_store_path = get_cron_dir() / "jobs.json"
    cron = CronService(cron_store_path)

    cron.on_job = None

    channels = channel_manager

    def _pick_heartbeat_target() -> tuple[str, str]:
        enabled = set(channels.enabled_channels)
        return "cli", "direct"

    async def on_heartbeat_execute(tasks: str) -> str:
        return "Heartbeat not yet supported in swarm mode"

    async def on_heartbeat_notify(response: str) -> None:
        pass

    hb_cfg = config.gateway.heartbeat
    heartbeat = HeartbeatService(
        workspace=config.workspace_path,
        provider=provider,
        model=config.agents.defaults.model,
        on_execute=on_heartbeat_execute,
        on_notify=on_heartbeat_notify,
        interval_s=hb_cfg.interval_s,
        enabled=False,
    )

    if channels.enabled_channels:
        console.print(f"[green]✓[/green] Channels enabled: {', '.join(channels.enabled_channels)}")
    else:
        console.print("[yellow]Warning: No channels enabled[/yellow]")

    console.print(f"[green]✓[/green] Swarm: {len(swarm.registry.get_all())} agents configured")

    console.print("[bold]🚀 Starting services...[/bold]")

    async def run():
        try:
            await asyncio.gather(
                swarm.start(),
                channels.start_all(),
            )
            console.print("[green]✅ All services started successfully![/green]")
            console.print(f"[dim]Gateway running at http://localhost:{port}[/dim]")
            console.print("[dim]Press Ctrl+C to stop[/dim]")
        except KeyboardInterrupt:
            console.print("\nShutting down...")
        finally:
            await swarm.stop()
            await channels.stop_all()
            console.print("[green]✅ Gateway stopped[/green]")

    asyncio.run(run())


# ============================================================================
# Agent Commands
# ============================================================================


@app.command()
def agent(
    message: str = typer.Option(None, "--message", "-m", help="Message to send to the agent"),
    session_id: str = typer.Option("cli:direct", "--session", "-s", help="Session ID"),
    workspace: str | None = typer.Option(None, "--workspace", "-w", help="Workspace directory"),
    config: str | None = typer.Option(None, "--config", "-c", help="Config file path"),
    markdown: bool = typer.Option(
        True, "--markdown/--no-markdown", help="Render assistant output as Markdown"
    ),
    logs: bool = typer.Option(
        False, "--logs/--no-logs", help="Show nanocats runtime logs during chat"
    ),
):
    """Interact with the agent directly."""
    from loguru import logger

    from nanocats.agent.loop import AgentLoop
    from nanocats.bus.queue import MessageBus
    from nanocats.config.paths import get_cron_dir
    from nanocats.cron.service import CronService

    config = _load_runtime_config(config, workspace)
    _print_deprecated_memory_window_notice(config)
    sync_workspace_templates(config.workspace_path)

    bus = MessageBus()
    provider = _make_provider(config)

    # Create cron service for tool usage (no callback needed for CLI unless running)
    cron_store_path = get_cron_dir() / "jobs.json"
    cron = CronService(cron_store_path)

    if logs:
        logger.enable("nanocats")
    else:
        logger.disable("nanocats")

    agent_loop = AgentLoop(
        bus=bus,
        provider=provider,
        workspace=config.workspace_path,
        model=config.agents.defaults.model,
        max_iterations=config.agents.defaults.max_tool_iterations,
        context_window_tokens=config.agents.defaults.context_window_tokens,
        web_search_config=config.tools.web.search,
        web_proxy=config.tools.web.proxy or None,
        exec_config=config.tools.exec,
        cron_service=cron,
        restrict_to_workspace=config.tools.restrict_to_workspace,
        mcp_servers=config.tools.mcp_servers,
        channels_config=config.channels,
    )

    # Show spinner when logs are off (no output to miss); skip when logs are on
    def _thinking_ctx():
        if logs:
            from contextlib import nullcontext

            return nullcontext()
        # Animated spinner is safe to use with prompt_toolkit input handling
        return console.status("[dim]nanocats is thinking...[/dim]", spinner="dots")

    async def _cli_progress(content: str, *, tool_hint: bool = False) -> None:
        ch = agent_loop.channels_config
        if ch and tool_hint and not ch.send_tool_hints:
            return
        if ch and not tool_hint and not ch.send_progress:
            return
        console.print(f"  [dim]↳ {content}[/dim]")

    if message:
        # Single message mode — direct call, no bus needed
        async def run_once():
            with _thinking_ctx():
                response = await agent_loop.process_direct(
                    message, session_id, on_progress=_cli_progress
                )
            _print_agent_response(response, render_markdown=markdown)
            await agent_loop.close_mcp()

        asyncio.run(run_once())
    else:
        # Interactive mode — route through bus like other channels
        from nanocats.bus.events import InboundMessage

        _init_prompt_session()
        console.print(
            f"{__logo__} Interactive mode (type [bold]exit[/bold] or [bold]Ctrl+C[/bold] to quit)\n"
        )

        if ":" in session_id:
            cli_channel, cli_chat_id = session_id.split(":", 1)
        else:
            cli_channel, cli_chat_id = "cli", session_id

        def _handle_signal(signum, frame):
            sig_name = signal.Signals(signum).name
            _restore_terminal()
            console.print(f"\nReceived {sig_name}, goodbye!")
            sys.exit(0)

        signal.signal(signal.SIGINT, _handle_signal)
        signal.signal(signal.SIGTERM, _handle_signal)
        # SIGHUP is not available on Windows
        if hasattr(signal, "SIGHUP"):
            signal.signal(signal.SIGHUP, _handle_signal)
        # Ignore SIGPIPE to prevent silent process termination when writing to closed pipes
        # SIGPIPE is not available on Windows
        if hasattr(signal, "SIGPIPE"):
            signal.signal(signal.SIGPIPE, signal.SIG_IGN)

        async def run_interactive():
            bus_task = asyncio.create_task(agent_loop.run())
            turn_done = asyncio.Event()
            turn_done.set()
            turn_response: list[str] = []

            async def _consume_outbound():
                while True:
                    try:
                        msg = await asyncio.wait_for(bus.consume_outbound(), timeout=1.0)
                        if msg.metadata.get("_progress"):
                            is_tool_hint = msg.metadata.get("_tool_hint", False)
                            ch = agent_loop.channels_config
                            if ch and is_tool_hint and not ch.send_tool_hints:
                                pass
                            elif ch and not is_tool_hint and not ch.send_progress:
                                pass
                            else:
                                await _print_interactive_line(msg.content)

                        elif not turn_done.is_set():
                            if msg.content:
                                turn_response.append(msg.content)
                            turn_done.set()
                        elif msg.content:
                            await _print_interactive_response(msg.content, render_markdown=markdown)

                    except asyncio.TimeoutError:
                        continue
                    except asyncio.CancelledError:
                        break

            outbound_task = asyncio.create_task(_consume_outbound())

            try:
                while True:
                    try:
                        _flush_pending_tty_input()
                        user_input = await _read_interactive_input_async()
                        command = user_input.strip()
                        if not command:
                            continue

                        if _is_exit_command(command):
                            _restore_terminal()
                            console.print("\nGoodbye!")
                            break

                        turn_done.clear()
                        turn_response.clear()

                        await bus.publish_inbound(
                            InboundMessage(
                                channel=cli_channel,
                                sender_id="user",
                                chat_id=cli_chat_id,
                                content=user_input,
                            )
                        )

                        with _thinking_ctx():
                            await turn_done.wait()

                        if turn_response:
                            _print_agent_response(turn_response[0], render_markdown=markdown)
                    except KeyboardInterrupt:
                        _restore_terminal()
                        console.print("\nGoodbye!")
                        break
                    except EOFError:
                        _restore_terminal()
                        console.print("\nGoodbye!")
                        break
            finally:
                agent_loop.stop()
                outbound_task.cancel()
                await asyncio.gather(bus_task, outbound_task, return_exceptions=True)
                await agent_loop.close_mcp()

        asyncio.run(run_interactive())


# ============================================================================
# Channel Commands
# ============================================================================


swarm_app = typer.Typer(help="Manage agent swarm")
app.add_typer(swarm_app, name="swarm")


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

        import json

        for path in sorted(agent_files):
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                agent_id = data.get("id", path.stem)
                name = data.get("name", "-")
                agent_type = data.get("type", "user")
                auto_start = "yes" if data.get("autoStart", True) else "no"
                channels = data.get("channels", {}).get("enabled", [])
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
    bound_user_key: str = typer.Option(
        "", "--bound-user", "-b", help="User binding key (for user agent only)"
    ),
    model: str = typer.Option("", "--model", "-m", help="Model to use"),
):
    """Create a new agent configuration."""
    import json
    from pathlib import Path

    from nanocats.config.schema import AgentChannelsConfig, AgentConfig, AgentType

    valid_types = {"admin", "user", "specialized", "task"}
    if agent_type not in valid_types:
        console.print(f"[red]Invalid agent type: {agent_type}[/red]")
        console.print(f"Valid types: {', '.join(valid_types)}")
        raise typer.Exit(1)

    session_policy_map = {
        "user": "per_user",
        "admin": "global",
        "specialized": "per_channel",
        "task": "per_task",
    }
    session_policy = session_policy_map.get(agent_type, "per_user")

    if agent_type == "user" and not bound_user_key:
        console.print(
            "[yellow]Warning:[/yellow] user agent should have --bound-user key for 1:1 binding"
        )

    agents_dir = Path.home() / ".nanocats" / "agents"
    agents_dir.mkdir(parents=True, exist_ok=True)

    agent_data = {
        "id": agent_id,
        "name": name or agent_id,
        "type": agent_type,
        "sessionPolicy": session_policy,
        "model": model or "anthropic/claude-opus-4-5",
        "provider": "anthropic",
        "autoStart": True,
        "channels": {"enabled": ["web"]},
    }

    if bound_user_key:
        agent_data["boundUserKey"] = bound_user_key

    agent_config_path = agents_dir / f"{agent_id}.json"
    with open(agent_config_path, "w", encoding="utf-8") as f:
        json.dump(agent_data, f, indent=2, ensure_ascii=False)

    console.print(f"[green]✓[/green] Created agent config: {agent_config_path}")
    console.print(f"  Type: {agent_type}")
    console.print(f"  Session policy: {session_policy}")
    if bound_user_key:
        console.print(f"  Bound user: {bound_user_key}")
    console.print("Edit the file to configure channels, MCP, skills, etc.")


channels_app = typer.Typer(help="Manage channels")
app.add_typer(channels_app, name="channels")


@channels_app.command("status")
def channels_status():
    """Show channel status."""
    from nanocats.channels.registry import discover_all
    from nanocats.config.loader import load_config

    config = load_config()

    table = Table(title="Channel Status")
    table.add_column("Channel", style="cyan")
    table.add_column("Enabled", style="green")

    for name, cls in sorted(discover_all().items()):
        section = getattr(config.channels, name, None)
        if section is None:
            enabled = False
        elif isinstance(section, dict):
            enabled = section.get("enabled", False)
        else:
            enabled = getattr(section, "enabled", False)
        table.add_row(
            cls.display_name,
            "[green]\u2713[/green]" if enabled else "[dim]\u2717[/dim]",
        )

    console.print(table)


def _get_bridge_dir() -> Path:
    """Get the bridge directory, setting it up if needed."""
    import shutil
    import subprocess

    # User's bridge location
    from nanocats.config.paths import get_bridge_install_dir

    user_bridge = get_bridge_install_dir()

    # Check if already built
    if (user_bridge / "dist" / "index.js").exists():
        return user_bridge

    # Check for npm
    npm_path = shutil.which("npm")
    if not npm_path:
        console.print("[red]npm not found. Please install Node.js >= 18.[/red]")
        raise typer.Exit(1)

    # Find source bridge: first check package data, then source dir
    pkg_bridge = Path(__file__).parent.parent / "bridge"  # nanocats/bridge (installed)
    src_bridge = Path(__file__).parent.parent.parent / "bridge"  # repo root/bridge (dev)

    source = None
    if (pkg_bridge / "package.json").exists():
        source = pkg_bridge
    elif (src_bridge / "package.json").exists():
        source = src_bridge

    if not source:
        console.print("[red]Bridge source not found.[/red]")
        console.print("Try reinstalling: pip install --force-reinstall nanocats")
        raise typer.Exit(1)

    console.print(f"{__logo__} Setting up bridge...")

    # Copy to user directory
    user_bridge.parent.mkdir(parents=True, exist_ok=True)
    if user_bridge.exists():
        shutil.rmtree(user_bridge)
    shutil.copytree(source, user_bridge, ignore=shutil.ignore_patterns("node_modules", "dist"))

    # Install and build
    try:
        console.print("  Installing dependencies...")
        subprocess.run([npm_path, "install"], cwd=user_bridge, check=True, capture_output=True)

        console.print("  Building...")
        subprocess.run([npm_path, "run", "build"], cwd=user_bridge, check=True, capture_output=True)

        console.print("[green]✓[/green] Bridge ready\n")
    except subprocess.CalledProcessError as e:
        console.print(f"[red]Build failed: {e}[/red]")
        if e.stderr:
            console.print(f"[dim]{e.stderr.decode()[:500]}[/dim]")
        raise typer.Exit(1)

    return user_bridge


@channels_app.command("login")
def channels_login():
    """Link device via QR code."""
    import shutil
    import subprocess

    from nanocats.config.loader import load_config
    from nanocats.config.paths import get_runtime_subdir

    config = load_config()
    bridge_dir = _get_bridge_dir()

    console.print(f"{__logo__} Starting bridge...")
    console.print("Scan the QR code to connect.\n")

    env = {**os.environ}
    wa_cfg = getattr(config.channels, "whatsapp", None) or {}
    bridge_token = (
        wa_cfg.get("bridgeToken", "")
        if isinstance(wa_cfg, dict)
        else getattr(wa_cfg, "bridge_token", "")
    )
    if bridge_token:
        env["BRIDGE_TOKEN"] = bridge_token
    env["AUTH_DIR"] = str(get_runtime_subdir("whatsapp-auth"))

    npm_path = shutil.which("npm")
    if not npm_path:
        console.print("[red]npm not found. Please install Node.js.[/red]")
        raise typer.Exit(1)

    try:
        subprocess.run([npm_path, "start"], cwd=bridge_dir, check=True, env=env)
    except subprocess.CalledProcessError as e:
        console.print(f"[red]Bridge failed: {e}[/red]")


# ============================================================================
# Plugin Commands
# ============================================================================

plugins_app = typer.Typer(help="Manage channel plugins")
app.add_typer(plugins_app, name="plugins")


@plugins_app.command("list")
def plugins_list():
    """List all discovered channels (built-in and plugins)."""
    from nanocats.channels.registry import discover_all, discover_channel_names
    from nanocats.config.loader import load_config

    config = load_config()
    builtin_names = set(discover_channel_names())
    all_channels = discover_all()

    table = Table(title="Channel Plugins")
    table.add_column("Name", style="cyan")
    table.add_column("Source", style="magenta")
    table.add_column("Enabled", style="green")

    for name in sorted(all_channels):
        cls = all_channels[name]
        source = "builtin" if name in builtin_names else "plugin"
        section = getattr(config.channels, name, None)
        if section is None:
            enabled = False
        elif isinstance(section, dict):
            enabled = section.get("enabled", False)
        else:
            enabled = getattr(section, "enabled", False)
        table.add_row(
            cls.display_name,
            source,
            "[green]yes[/green]" if enabled else "[dim]no[/dim]",
        )

    console.print(table)


# ============================================================================
# Status Commands
# ============================================================================


@app.command()
def status():
    """Show nanocats status."""
    from nanocats.config.loader import get_config_path, load_config

    config_path = get_config_path()
    config = load_config()
    workspace = config.workspace_path

    console.print(f"{__logo__} nanocats Status\n")

    console.print(
        f"Config: {config_path} {'[green]✓[/green]' if config_path.exists() else '[red]✗[/red]'}"
    )
    console.print(
        f"Workspace: {workspace} {'[green]✓[/green]' if workspace.exists() else '[red]✗[/red]'}"
    )

    if config_path.exists():
        from nanocats.providers.registry import PROVIDERS

        console.print(f"Model: {config.agents.defaults.model}")

        # Check API keys from registry
        for spec in PROVIDERS:
            p = getattr(config.providers, spec.name, None)
            if p is None:
                continue
            if spec.is_oauth:
                console.print(f"{spec.label}: [green]✓ (OAuth)[/green]")
            elif spec.is_local:
                # Local deployments show api_base instead of api_key
                if p.api_base:
                    console.print(f"{spec.label}: [green]✓ {p.api_base}[/green]")
                else:
                    console.print(f"{spec.label}: [dim]not set[/dim]")
            else:
                has_key = bool(p.api_key)
                console.print(
                    f"{spec.label}: {'[green]✓[/green]' if has_key else '[dim]not set[/dim]'}"
                )


# ============================================================================
# OAuth Login
# ============================================================================

provider_app = typer.Typer(help="Manage providers")
app.add_typer(provider_app, name="provider")


_LOGIN_HANDLERS: dict[str, callable] = {}


def _register_login(name: str):
    def decorator(fn):
        _LOGIN_HANDLERS[name] = fn
        return fn

    return decorator


@provider_app.command("login")
def provider_login(
    provider: str = typer.Argument(
        ..., help="OAuth provider (e.g. 'openai-codex', 'github-copilot')"
    ),
):
    """Authenticate with an OAuth provider."""
    from nanocats.providers.registry import PROVIDERS

    key = provider.replace("-", "_")
    spec = next((s for s in PROVIDERS if s.name == key and s.is_oauth), None)
    if not spec:
        names = ", ".join(s.name.replace("_", "-") for s in PROVIDERS if s.is_oauth)
        console.print(f"[red]Unknown OAuth provider: {provider}[/red]  Supported: {names}")
        raise typer.Exit(1)

    handler = _LOGIN_HANDLERS.get(spec.name)
    if not handler:
        console.print(f"[red]Login not implemented for {spec.label}[/red]")
        raise typer.Exit(1)

    console.print(f"{__logo__} OAuth Login - {spec.label}\n")
    handler()


@_register_login("openai_codex")
def _login_openai_codex() -> None:
    try:
        from oauth_cli_kit import get_token, login_oauth_interactive

        token = None
        try:
            token = get_token()
        except Exception:
            pass
        if not (token and token.access):
            console.print("[cyan]Starting interactive OAuth login...[/cyan]\n")
            token = login_oauth_interactive(
                print_fn=lambda s: console.print(s),
                prompt_fn=lambda s: typer.prompt(s),
            )
        if not (token and token.access):
            console.print("[red]✗ Authentication failed[/red]")
            raise typer.Exit(1)
        console.print(
            f"[green]✓ Authenticated with OpenAI Codex[/green]  [dim]{token.account_id}[/dim]"
        )
    except ImportError:
        console.print("[red]oauth_cli_kit not installed. Run: pip install oauth-cli-kit[/red]")
        raise typer.Exit(1)


@_register_login("github_copilot")
def _login_github_copilot() -> None:
    import asyncio

    console.print("[cyan]Starting GitHub Copilot device flow...[/cyan]\n")

    async def _trigger():
        from litellm import acompletion

        await acompletion(
            model="github_copilot/gpt-4o",
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=1,
        )

    try:
        asyncio.run(_trigger())
        console.print("[green]✓ Authenticated with GitHub Copilot[/green]")
    except Exception as e:
        console.print(f"[red]Authentication error: {e}[/red]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
