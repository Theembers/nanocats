"""CLI commands for nanocats."""

import asyncio
import os
import signal
import sys
from pathlib import Path

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
from prompt_toolkit.shortcuts import choice
from rich.console import Console
from rich.table import Table

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


def version_callback(value: bool):
    if value:
        console.print(f"{__logo__} nanocats v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool = typer.Option(
        None, "--version", "-v", callback=version_callback, is_eager=True
    ),
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
    console.print(f"\n[bold cyan]{__logo__} nanocats CLI 帮助[/bold cyan]\n")
    
    # Main commands
    console.print("[bold]主命令:[/bold]")
    console.print("  [green]onboard[/green]          初始化配置和 workspace")
    console.print("  [green]setup[/green]            交互式设置向导")
    console.print("  [green]gateway[/green]          启动 Gateway 服务")
    console.print("  [green]status[/green]           显示系统状态")
    console.print("  [green]help[/green] [command]   显示帮助信息\n")

    # Sub commands
    console.print("[bold]子命令:[/bold]")
    console.print("  [green]swarm status[/green]     显示 Swarm 状态")
    console.print("  [green]swarm list[/green]       列出所有 Agent")
    console.print("  [green]swarm create[/green]     创建新 Agent")
    console.print("  [green]swarm mcp[/green]        管理 MCP 服务器")
    console.print("  [green]channels status[/green]  显示通道状态")
    console.print("  [green]channels login[/green]   WhatsApp 设备登录")
    console.print("  [green]provider login[/green]   OAuth 登录\n")
    
    console.print("[dim]使用 \"nanocats help <command>\" 查看具体指令的详细参数说明[/dim]\n")


def _show_command_help(command: str):
    """Display detailed help for a specific command."""
    help_map = {
        "onboard": {
            "desc": "初始化 nanocats 配置和 workspace",
            "usage": "nanocats onboard",
            "options": [],
        },
        "setup": {
            "desc": "交互式设置向导，配置模型提供商、Agent、通道",
            "usage": "nanocats setup",
            "options": [],
        },
        "gateway": {
            "desc": "启动 Gateway 服务（Swarm 模式）",
            "usage": "nanocats gateway [OPTIONS]",
            "options": [
                ("-p, --port", "Gateway 端口"),
                ("-w, --workspace", "Workspace 目录"),
                ("-c, --config", "配置文件路径"),
                ("-v, --verbose", "启用调试日志"),
            ],
        },

        "status": {
            "desc": "显示 nanocats 系统状态",
            "usage": "nanocats status",
            "options": [],
        },
        "swarm": {
            "desc": "Swarm 管理命令",
            "usage": "nanocats swarm <subcommand>",
            "options": [
                ("status", "显示 Swarm 状态"),
                ("list", "列出所有 Agent"),
                ("create <id>", "创建新 Agent"),
                ("mcp <action>", "管理 MCP 服务器 (list/install/uninstall)"),
            ],
        },
        "channels": {
            "desc": "通道管理命令",
            "usage": "nanocats channels <subcommand>",
            "options": [
                ("status", "显示通道状态"),
                ("login", "WhatsApp 设备登录（扫码）"),
            ],
        },
        "provider": {
            "desc": "OAuth 提供商登录",
            "usage": "nanocats provider login <provider>",
            "options": [
                ("openai-codex", "OpenAI Codex OAuth 登录"),
                ("github-copilot", "GitHub Copilot OAuth 登录"),
            ],
        },
    }
    
    if command not in help_map:
        console.print(f"[red]未知命令: {command}[/red]")
        console.print("\n使用 [cyan]nanocats help[/cyan] 查看所有可用命令")
        raise typer.Exit(1)
    
    info = help_map[command]
    console.print(f"\n[bold cyan]{__logo__} nanocats help {command}[/bold cyan]\n")
    console.print(f"[bold]描述:[/bold] {info['desc']}\n")
    console.print(f"[bold]用法:[/bold] [green]{info['usage']}[/green]\n")
    
    if info["options"]:
        console.print("[bold]选项/子命令:[/bold]")
        for opt, desc in info["options"]:
            console.print(f"  [green]{opt:<18}[/green] {desc}")
        console.print()


# ============================================================================
# Onboard / Setup
# ============================================================================

DEFAULT_WEB_PORT = 15751


def _get_web_port() -> int:
    """Get web server port from config or return default."""
    try:
        from nanocats.config.loader import load_config
        config = load_config()
        return config.channels.web.port
    except Exception:
        return DEFAULT_WEB_PORT


# def _start_web_server() -> None:
#     """
#     Start the web server on configured port.

#     Logic:
#     1. Try to start normally.
#     2. If the port is already in use (Errno 48 / 98), check if the running
#        process responds to our health endpoint.
#        a. If it responds → it's already healthy: restart it so the latest
#           code is loaded.
#        b. Kill the old process and start a fresh server.
#     3. On any other error, print a message and return.
#     """
#     import socket
#     import time
#     import urllib.request
#     import uvicorn

#     web_port = _get_web_port()

#     def _port_in_use() -> bool:
#         with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
#             return s.connect_ex(("127.0.0.1", web_port)) == 0

#     def _kill_port() -> bool:
#         """Kill whatever is listening on web_port. Returns True on success."""
#         import subprocess
#         try:
#             result = subprocess.run(
#                 ["lsof", "-ti", f":{web_port}"],
#                 capture_output=True, text=True
#             )
#             pids = result.stdout.strip().split()
#             if not pids:
#                 return False
#             for pid in pids:
#                 try:
#                     os.kill(int(pid), signal.SIGTERM)
#                 except ProcessLookupError:
#                     pass
#             # Give processes up to 3 s to exit
#             for _ in range(15):
#                 time.sleep(0.2)
#                 if not _port_in_use():
#                     return True
#             # Force-kill if still up
#             for pid in pids:
#                 try:
#                     os.kill(int(pid), signal.SIGKILL)
#                 except ProcessLookupError:
#                     pass
#             time.sleep(0.5)
#             return not _port_in_use()
#         except FileNotFoundError:
#             # lsof not available (Windows)
#             return False

#     def _print_banner() -> None:
#         console.print("=" * 60)
#         console.print("🐱 nanocats Web Interface")
#         console.print("=" * 60)
#         console.print(f"📱 Web UI:   http://localhost:{web_port}")
#         console.print(f"📚 API Docs: http://localhost:{web_port}/docs")
#         console.print("=" * 60)
#         console.print("\n[dim]Press Ctrl+C to stop the server[/dim]\n")

#     def _run() -> None:
#         _print_banner()
#         uvicorn.run(
#             "nanocats.web.backend.main:app",
#             host="0.0.0.0",
#             port=web_port,
#             reload=False,
#             log_level="info",
#         )

#     # ── First attempt ────────────────────────────────────────────────────────
#     if not _port_in_use():
#         try:
#             _run()
#         except KeyboardInterrupt:
#             console.print("\n[yellow]Web server stopped[/yellow]")
#         return

#     # ── Port is occupied ─────────────────────────────────────────────────────
#     console.print(f"\n[yellow]Port {web_port} is already in use.[/yellow]")
#     console.print("[dim]Restarting the web server with the latest code...[/dim]")

#     if not _kill_port():
#         console.print(
#             f"[red]Could not free port {web_port}. "
#             "Please stop the existing process manually and run [cyan]nanocats gateway[/cyan] again.[/red]"
#         )
#         return

#     console.print(f"[green]✓ Previous server stopped.[/green]")
#     try:
#         _run()
#     except KeyboardInterrupt:
#         console.print("\n[yellow]Web server stopped[/yellow]")


def _interactive_select(options: list[str], title: str = "Select an option:") -> int:
    """Interactive selection using arrow keys and Enter.
    
    Args:
        options: List of option strings to display
        title: Title to show above the options
    
    Returns:
        Index of the selected option (0-based)
    """
    import sys
    
    # Check if we're in an interactive terminal
    if sys.stdin.isatty():
        try:
            # Use prompt_toolkit's built-in choice function
            # options should be list of (value, label) tuples
            option_tuples = [(opt, opt) for opt in options]
            result = choice(
                message=title + " ",
                options=option_tuples,
                default=options[0],
            )
            return options.index(result)
        except Exception:
            pass  # Fall through to fallback
    
    # Fallback: show options and ask for number input
    console.print(f"\n[bold]{title}[/bold]\n")
    for i, opt in enumerate(options, 1):
        console.print(f"  {i}. {opt}")
    
    default_idx = 1
    while True:
        try:
            choice_str = typer.prompt("Select option", default=str(default_idx), show_default=True)
            idx = int(choice_str) - 1
            if 0 <= idx < len(options):
                return idx
        except ValueError:
            pass
        console.print("[red]Invalid option. Please try again.[/red]")


@app.command()
def onboard():
    """Initialize nanocats configuration and workspace."""
    from nanocats.config.loader import get_config_path, load_config, save_config
    from nanocats.config.schema import Config

    config_path = get_config_path()

    if config_path.exists():
        console.print(f"[yellow]Config already exists at {config_path}[/yellow]")
        
        options = [
            "Overwrite with defaults (existing values will be lost)",
            "Refresh config, keeping existing values and adding new fields"
        ]
        choice = _interactive_select(options, "Choose action:")
        
        if choice == 0:
            config = Config()
            save_config(config)
            console.print(f"[green]✓[/green] Config reset to defaults at {config_path}")
        else:
            config = load_config()
            save_config(config)
            console.print(f"[green]✓[/green] Config refreshed at {config_path} (existing values preserved)")
    else:
        save_config(Config())
        console.print(f"[green]✓[/green] Created config at {config_path}")

    # Create workspace
    workspace = get_workspace_path()

    if not workspace.exists():
        workspace.mkdir(parents=True, exist_ok=True)
        console.print(f"[green]✓[/green] Created workspace at {workspace}")

    sync_workspace_templates(workspace)

    console.print(f"\n{__logo__} nanocats is ready!")
    
    # Ask if user wants to run setup or start web
    console.print("[bold cyan]━━━ Quick Start ━━━[/bold cyan]\n")

    options = [
        "Run setup wizard (recommended for new users)",
        "Start Gateway",
        "Skip for now"
    ]
    choice = _interactive_select(options, "What would you like to do next?")

    if choice == 0:
        console.print()
        setup()
    elif choice == 1:
        console.print()
        # Run gateway directly
        from nanocats.config.loader import load_config
        runtime_config = load_config()
        _run_swarm_gateway(runtime_config)
    else:
        console.print("\n[dim]You can start the web server later with: nanocats gateway[/dim]\n")


@app.command()
def setup():
    """Interactive setup wizard for nanocats installation."""
    import json
    import secrets
    import shutil
    import subprocess
    from pathlib import Path
    
    from nanocats.config.loader import get_config_path, load_config, save_config
    from nanocats.config.schema import (
        AgentInstanceConfig,
        AgentChannelBindingConfig,
        Config,
    )
    
    console.print(f"\n{__logo__} [bold cyan]nanocats Setup Wizard[/bold cyan]\n")
    console.print("This wizard will help you set up nanocats with:\n")
    console.print("  1. Dependency verification")
    console.print("  2. Model provider configuration")
    console.print("  3. Admin agent creation")
    console.print("  4. Channel configuration\n")
    
    # =========================================================================
    # Step 1: Dependency Verification
    # =========================================================================
    console.print("[bold]━━━ Step 1/4: Dependency Verification ━━━[/bold]\n")
    
    # Check Python version
    py_version = sys.version_info
    py_ok = py_version >= (3, 11)
    console.print(f"  Python {py_version.major}.{py_version.minor}.{py_version.micro} " +
                  ("[green]✓[/green]" if py_ok else "[red]✗ (requires 3.11+)[/red]"))
    
    # Check Node.js (optional, for WhatsApp bridge)
    node_version = None
    node_ok = False
    if shutil.which("node"):
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            node_version = result.stdout.strip().lstrip("v")
            major = int(node_version.split(".")[0])
            node_ok = major >= 18
        except Exception:
            pass
    console.print(f"  Node.js {node_version or 'not installed'} " +
                  ("[green]✓[/green]" if node_ok else "[yellow]○ (optional, for WhatsApp)[/yellow]"))
    
    # Check npm
    npm_ok = shutil.which("npm") is not None
    console.print(f"  npm {'installed' if npm_ok else 'not installed'} " +
                  ("[green]✓[/green]" if npm_ok else "[yellow]○ (optional)[/yellow]"))
    
    # Check core dependencies
    core_deps = [
        ("typer", "typer"),
        ("rich", "rich"),
        ("prompt_toolkit", "prompt_toolkit"),
        ("pydantic", "pydantic"),
        ("litellm", "litellm"),
        ("loguru", "loguru"),
    ]
    
    missing_deps = []
    for name, module in core_deps:
        try:
            __import__(module)
            console.print(f"  {name} [green]✓[/green]")
        except ImportError:
            console.print(f"  {name} [red]✗[/red]")
            missing_deps.append(name)
    
    # Check web dependencies (optional)
    web_deps_ok = True
    try:
        import fastapi
        import uvicorn
        console.print(f"  fastapi [green]✓[/green]")
        console.print(f"  uvicorn [green]✓[/green]")
    except ImportError:
        web_deps_ok = False
        console.print(f"  web deps [yellow]○ (optional, run: pip install nanocats[web])[/yellow]")
    
    if missing_deps:
        console.print(f"\n[red]Missing required dependencies: {', '.join(missing_deps)}[/red]")
        console.print("Install with: [cyan]pip install nanocats[/cyan]\n")
        raise typer.Exit(1)
    
    console.print("\n[green]✓ All core dependencies satisfied[/green]\n")
    
    # =========================================================================
    # Step 2: Model Provider Configuration
    # =========================================================================
    console.print("[bold]━━━ Step 2/4: Model Provider Configuration ━━━[/bold]\n")
    
    # Load or create config
    config_path = get_config_path()
    if config_path.exists():
        config = load_config()
        console.print(f"[dim]Using existing config: {config_path}[/dim]\n")
    else:
        config = Config()
        console.print(f"[dim]Creating new config: {config_path}[/dim]\n")
    
    # Show available providers
    console.print("Available model providers:\n")
    providers = [
        ("openrouter", "OpenRouter (recommended, access to all models)", "https://openrouter.ai/keys"),
        ("anthropic", "Anthropic Claude (direct)", "https://console.anthropic.com"),
        ("openai", "OpenAI GPT (direct)", "https://platform.openai.com"),
        ("deepseek", "DeepSeek (direct)", "https://platform.deepseek.com"),
        ("minimax", "MiniMax", "https://platform.minimaxi.com"),
        ("qwen", "Qwen", "https://dashscope.console.aliyun.com"),
        ("zhipu", "Zhipu AI", "https://open.bigmodel.cn"),
        ("ollama", "Ollama (local, free)", None),
        ("custom", "Custom OpenAI-compatible endpoint", None),
    ]
    
    provider_options = [desc for _, desc, _ in providers]
    provider_idx = _interactive_select(provider_options, "Select a model provider:")
    provider_key = providers[provider_idx][0]

    console.print()
    
    # Get API key if needed
    if provider_key not in ("ollama", "custom"):
        url = providers[[p[0] for p in providers].index(provider_key)][2]
        console.print(f"[dim]Get your API key at: {url}[/dim]\n")
        
        existing_key = getattr(config.providers, provider_key, None)
        existing_key = existing_key.api_key if existing_key else None
        
        if existing_key:
            masked = existing_key[:8] + "..." + existing_key[-4:] if len(existing_key) > 12 else "***"
            console.print(f"Existing API key found: {masked}")
            if not typer.confirm("Update API key?", default=False):
                api_key = existing_key
            else:
                api_key = typer.prompt("Enter API key", hide_input=True)
        else:
            api_key = typer.prompt("Enter API key", hide_input=True)
        
        # Update config
        provider_config = getattr(config.providers, provider_key, None)
        if provider_config:
            provider_config.api_key = api_key
        else:
            from nanocats.config.schema import ProviderConfig
            setattr(config.providers, provider_key, ProviderConfig(api_key=api_key))
    
    elif provider_key == "ollama":
        console.print("[dim]Make sure Ollama is running: ollama serve[/dim]")
    
    elif provider_key == "custom":
        api_base = typer.prompt("Enter API base URL", default="http://localhost:8000/v1")
        api_key = typer.prompt("Enter API key (or press Enter to skip)", default="", hide_input=True)
        
        if hasattr(config.providers, "custom"):
            config.providers.custom.api_base = api_base
            if api_key:
                config.providers.custom.api_key = api_key
        else:
            from nanocats.config.schema import ProviderConfig
            config.providers.custom = ProviderConfig(api_base=api_base, api_key=api_key or None)
    
    # Select model
    console.print()
    model_suggestions = {
        "openrouter": "anthropic/claude-sonnet-4",
        "anthropic": "claude-sonnet-4-20250514",
        "openai": "gpt-4o",
        "deepseek": "deepseek-chat",
        "minimax": "MiniMax-M2.5",
        "qwen": "qwen3-max",
        "zhipu": "glm-5",
        "ollama": "llama3.2",
        "custom": "local-model",
    }
    
    default_model = model_suggestions.get(provider_key, "gpt-4o")
    model = typer.prompt("Enter model name", default=default_model)
    
    config.agents.defaults.model = model
    config.agents.defaults.provider = provider_key
    
    console.print(f"\n[green]✓ Provider configured: {provider_key} / {model}[/green]\n")
    
    # =========================================================================
    # Step 3: Admin Agent Configuration
    # =========================================================================
    console.print("[bold]━━━ Step 3/4: Admin Agent Configuration ━━━[/bold]\n")
    
    # Agent ID
    default_agent_id = "admin"
    agent_id = typer.prompt("Agent ID", default=default_agent_id)
    
    # Agent name
    agent_name = typer.prompt("Agent display name", default="Admin Agent")
    
    # Access token
    generated_token = secrets.token_urlsafe(16)
    console.print(f"\n[dim]Generated access token: {generated_token}[/dim]")
    use_generated = typer.confirm("Use generated token?", default=True)
    
    if use_generated:
        access_token = generated_token
    else:
        access_token = typer.prompt("Enter custom access token", hide_input=True)
    
    # Agent type - always supervisor for admin
    agent_type = "supervisor"
    console.print(f"\n[dim]Agent type: [cyan]{agent_type}[/cyan] (admin agent)[/dim]")
    
    # Create agent config
    agents_dir = Path.home() / ".nanocats" / "agents"
    agents_dir.mkdir(parents=True, exist_ok=True)
    
    agent_config = AgentInstanceConfig(
        id=agent_id,
        name=agent_name,
        type=agent_type,
        model=model,
        provider=provider_key,
        auto_start=True,
    )
    agent_config.token = access_token  # Store token
    
    # Save agent config
    agent_config_path = agents_dir / f"{agent_id}.json"
    with open(agent_config_path, "w", encoding="utf-8") as f:
        json.dump(agent_config.model_dump(by_alias=True), f, indent=2, ensure_ascii=False)
    
    # Initialize agent workspace with template files
    agent_workspace = Path.home() / ".nanocats" / "workspaces" / agent_id
    sync_workspace_templates(agent_workspace, silent=True)
    
    console.print(f"\n[green]✓ Agent '{agent_id}' created at {agent_config_path}[/green]")
    console.print(f"[green]✓ Workspace initialized at {agent_workspace}[/green]\n")
    
    # =========================================================================
    # Step 4: Channel Configuration
    # =========================================================================
    console.print("[bold]━━━ Step 4/4: Channel Configuration ━━━[/bold]\n")
    
    console.print("Available channels:\n")
    channels = [
        ("telegram", "Telegram", "Bot token from @BotFather"),
        ("discord", "Discord", "Bot token + Message Content intent"),
        ("feishu", "Feishu (飞书)", "App ID + App Secret"),
        ("dingtalk", "DingTalk (钉钉)", "App Key + App Secret"),
        ("slack", "Slack", "Bot token + App-Level token"),
        ("whatsapp", "WhatsApp", "QR code scan"),
        ("email", "Email", "IMAP/SMTP credentials"),
        ("none", "None (CLI only)", "Skip channel setup"),
    ]
    
    channel_options = [f"{name} ({req})" for key, name, req in channels]
    channel_idx = _interactive_select(channel_options, "Select a channel:")
    selected_channel = channels[channel_idx][0]

    # Configure selected channel
    if selected_channel != "none":
        console.print()
        
        if selected_channel == "telegram":
            token = typer.prompt("Enter Telegram bot token")
            allow_from = typer.prompt("Enter allowed user IDs (comma-separated, or * for all)", default="*")
            config.channels.telegram.enabled = True
            config.channels.telegram.token = token
            if allow_from != "*":
                config.channels.telegram.allow_from = allow_from.split(",")
        
        elif selected_channel == "discord":
            token = typer.prompt("Enter Discord bot token")
            config.channels.discord.enabled = True
            config.channels.discord.token = token
        
        elif selected_channel == "feishu":
            app_id = typer.prompt("Enter Feishu App ID")
            app_secret = typer.prompt("Enter Feishu App Secret", hide_input=True)
            config.channels.feishu.enabled = True
            config.channels.feishu.app_id = app_id
            config.channels.feishu.app_secret = app_secret
        
        elif selected_channel == "dingtalk":
            client_id = typer.prompt("Enter DingTalk App Key")
            client_secret = typer.prompt("Enter DingTalk App Secret", hide_input=True)
            config.channels.dingtalk.enabled = True
            config.channels.dingtalk.client_id = client_id
            config.channels.dingtalk.client_secret = client_secret
        
        elif selected_channel == "slack":
            bot_token = typer.prompt("Enter Slack bot token (xoxb-...)")
            app_token = typer.prompt("Enter Slack app token (xapp-...)")
            config.channels.slack.enabled = True
            config.channels.slack.bot_token = bot_token
            config.channels.slack.app_token = app_token
        
        elif selected_channel == "whatsapp":
            console.print("[dim]Run 'nanocats channels login' to scan QR code[/dim]")
            config.channels.whatsapp.enabled = True
        
        elif selected_channel == "email":
            imap_host = typer.prompt("Enter IMAP host")
            imap_user = typer.prompt("Enter IMAP username")
            imap_pass = typer.prompt("Enter IMAP password", hide_input=True)
            smtp_host = typer.prompt("Enter SMTP host")
            config.channels.email.enabled = True
            config.channels.email.imap_host = imap_host
            config.channels.email.imap_user = imap_user
            config.channels.email.imap_pass = imap_pass
            config.channels.email.smtp_host = smtp_host
        
        # Enable channel for agent
        agent_config.channels = AgentChannelBindingConfig(enabled=[selected_channel])
        
        console.print(f"\n[green]✓ Channel '{selected_channel}' configured[/green]\n")
    
    # =========================================================================
    # Save and Summary
    # =========================================================================
    
    # Enable swarm mode
    config.agents.swarm.enabled = True
    
    # Save main config
    save_config(config)
    
    # Create workspace
    workspace = get_workspace_path()
    if not workspace.exists():
        workspace.mkdir(parents=True, exist_ok=True)
    sync_workspace_templates(workspace)
    
    # Print summary
    console.print("\n" + "=" * 60)
    console.print(f"{__logo__} [bold green]Setup Complete![/bold green]")
    console.print("=" * 60)
    console.print()
    console.print(f"[bold]Configuration:[/bold]")
    console.print(f"  Config file: [cyan]{config_path}[/cyan]")
    console.print(f"  Workspace: [cyan]{workspace}[/cyan]")
    console.print()
    console.print(f"[bold]Provider:[/bold]")
    console.print(f"  Provider: [cyan]{provider_key}[/cyan]")
    console.print(f"  Model: [cyan]{model}[/cyan]")
    console.print()
    console.print(f"[bold]Admin Agent:[/bold]")
    console.print(f"  ID: [cyan]{agent_id}[/cyan]")
    console.print(f"  Name: [cyan]{agent_name}[/cyan]")
    console.print(f"  Type: [cyan]{agent_type}[/cyan]")
    console.print(f"  Access Token: [yellow]{access_token}[/yellow]")
    console.print()
    
    if selected_channel != "none":
        console.print(f"[bold]Channel:[/bold]")
        console.print(f"  Enabled: [cyan]{selected_channel}[/cyan]")
        console.print()
    
    web_port = _get_web_port()

    # Ask if user wants to start web server
    console.print("[bold cyan]━━━ Start Gateway Server ━━━[/bold cyan]\n")
    
    # Run gateway directly with the loaded config
    from nanocats.config.loader import load_config
    runtime_config = load_config()
    _run_swarm_gateway(runtime_config)
    
    console.print("[bold cyan]━━━ Gateway stopped ━━━[/bold cyan]\n")

    # console.print("Would you like to start the Web UI now?")
    # console.print(f"  Access: [yellow]http://localhost:{web_port}[/yellow]")
    # console.print(f"  Login with Agent ID: [cyan]{agent_id}[/cyan] and your token\n")

    # if typer.confirm("Start Web UI ?", default=True):
    #     console.print()
    #     _start_web_server()


def _make_provider(config: Config):
    """Create the appropriate LLM provider from config."""
    from nanocats.providers.base import GenerationSettings
    from nanocats.providers.openai_codex_provider import OpenAICodexProvider
    from nanocats.providers.azure_openai_provider import AzureOpenAIProvider

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    p = config.get_provider(model)

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
            console.print("Set them in ~/.nanocats/config.json under providers.azure_openai section")
            console.print("Use the model field to specify the deployment name.")
            raise typer.Exit(1)
        provider = AzureOpenAIProvider(
            api_key=p.api_key,
            api_base=p.api_base,
            default_model=model,
        )
    else:
        from nanocats.providers.openai_provider import OpenAIProvider
        from nanocats.providers.registry import find_by_name
        spec = find_by_name(provider_name)
        if not model.startswith("bedrock/") and not (p and p.api_key) and not (spec and (spec.is_oauth or spec.is_local)):
            console.print("[red]Error: No API key configured.[/red]")
            console.print("Set one in ~/.nanocats/config.json under providers section")
            raise typer.Exit(1)
        provider = OpenAIProvider(
            api_key=p.api_key if p else None,
            api_base=config.get_api_base(model),
            default_model=model,
            extra_headers=p.extra_headers if p else None,
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
    """Start the nanocats gateway."""
    from nanocats.agent.loop import AgentLoop
    from nanocats.bus.queue import MessageBus
    from nanocats.channels.manager import ChannelManager
    from nanocats.config.paths import get_cron_dir
    from nanocats.cron.service import CronService
    from nanocats.cron.types import CronJob
    from nanocats.heartbeat.service import HeartbeatService
    from nanocats.session.manager import SessionManager

    if verbose:
        import logging
        logging.basicConfig(level=logging.DEBUG)

    config = _load_runtime_config(config, workspace)
    _print_deprecated_memory_window_notice(config)
    port = port if port is not None else config.gateway.port

    console.print(f"{__logo__} Starting nanocats gateway on port {port}...")
    sync_workspace_templates(config.workspace_path)

    # Unified entry: always use swarm manager
    # If no agents are configured, it will create a default agent
    asyncio.run(_run_swarm_gateway(config))
    return


def _run_swarm_gateway(config: Config) -> None:
    """Run the gateway in swarm mode."""
    from nanocats.bus.queue import MessageBus
    from nanocats.config.paths import get_cron_dir
    from nanocats.cron.service import CronService
    from nanocats.swarm.manager import SwarmManager

    console.print("[cyan]Swarm mode enabled[/cyan]")

    # Check if web channel is enabled and start web backend
    web_server_task = None
    if config.channels.web.enabled:
        # Check if fastapi is installed
        try:
            import fastapi
        except ImportError:
            console.print("[red]ERROR: fastapi is required for Web UI but not installed.[/red]")
            console.print("[dim]Please run: pip install nanocats[web]  # or: pip install fastapi uvicorn[/dim]")
            raise typer.Exit(1)
        
        web_server_task = _start_web_backend(config)

    bus = MessageBus()
    provider = _make_provider(config)

    # Create cron service
    cron_store_path = get_cron_dir() / "jobs.json"
    cron = CronService(cron_store_path)

    # Create swarm manager
    swarm = SwarmManager(
        config=config,
        provider=provider,
        cron_service=cron,
    )

    async def run_swarm():
        try:
            await swarm.start()

            # Show status
            agents = swarm.list_agents()
            if agents:
                console.print(f"[green]✓[/green] Started {len(agents)} agent(s):")
                for a in agents:
                    channels_str = ", ".join(a["channels"]) if a["channels"] else "none"
                    console.print(f"  - {a['name']} ({a['type']}): channels={channels_str}")
            else:
                console.print("[yellow]Warning: No agents configured[/yellow]")
                console.print("Create agent configs in ~/.nanocats/agents/")

            # Show web backend status
            if config.channels.web.enabled:
                web_port = config.channels.web.port
                console.print(f"[green]✓[/green] Web UI: http://localhost:{web_port}")

            # Keep running
            while swarm._running:
                await asyncio.sleep(1)

        except KeyboardInterrupt:
            console.print("\nShutting down swarm...")
        finally:
            await swarm.stop()

    asyncio.run(run_swarm())


def _start_web_backend(config: Config):
    """Start the web backend in a background thread."""
    import threading
    import uvicorn
    from nanocats.web.backend import main as web_main

    web_port = config.channels.web.port

    def run():
        uvicorn.run(
            web_main.app,
            host="0.0.0.0",
            port=web_port,
            log_level="warning",
        )

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread




# ============================================================================
# Agent Commands
# ============================================================================


# ============================================================================
# Swarm Commands
# ============================================================================


swarm_app = typer.Typer(help="Manage agent swarm")
app.add_typer(swarm_app, name="swarm")


@swarm_app.command("status")
def swarm_status():
    """Show swarm status."""
    from nanocats.config.loader import load_config

    config = load_config()

    if not config.agents.swarm.enabled:
        console.print("[yellow]Swarm mode is not enabled.[/yellow]")
        console.print("Set 'agents.swarm.enabled = true' in config.json to enable.")
        return

    from nanocats.config.loader import load_agent_configs

    agent_configs = load_agent_configs(config)

    console.print(f"{__logo__} Swarm Status\n")
    console.print(f"Max agents: {config.agents.swarm.max_agents}")
    console.print(f"Agents dir: {config.agents.swarm.agents_dir}")
    console.print(f"MCP registry: {config.agents.swarm.mcp_registry_path}")

    if agent_configs:
        console.print(f"\n[green]Configured agents ({len(agent_configs)}):[/green]")
        table = Table()
        table.add_column("ID", style="cyan")
        table.add_column("Name")
        table.add_column("Type")
        table.add_column("Auto-start")
        table.add_column("Channels")

        for ac in agent_configs:
            channels = ", ".join(ac.channels.enabled) if ac.channels.enabled else "-"
            table.add_row(
                ac.id,
                ac.name or "-",
                ac.type,
                "yes" if ac.auto_start else "no",
                channels,
            )
        console.print(table)
    else:
        console.print("\n[yellow]No agents configured.[/yellow]")
        console.print("Create agent configs in ~/.nanocats/agents/")


@swarm_app.command("list")
def swarm_list():
    """List all configured agents."""
    from nanocats.config.loader import load_config, load_agent_configs

    config = load_config()
    agent_configs = load_agent_configs(config)

    if not agent_configs:
        console.print("No agents configured.")
        return

    table = Table(title="Configured Agents")
    table.add_column("ID", style="cyan")
    table.add_column("Name")
    table.add_column("Type")
    table.add_column("Model")
    table.add_column("Workspace")

    for ac in agent_configs:
        table.add_row(
            ac.id,
            ac.name or "-",
            ac.type,
            ac.model or "(default)",
            str(ac.workspace_path),
        )

    console.print(table)


@swarm_app.command("create")
def swarm_create(
    agent_id: str = typer.Argument(..., help="Agent ID"),
    name: str = typer.Option("", "--name", "-n", help="Agent display name"),
    agent_type: str = typer.Option("user", "--type", "-t", help="Agent type (supervisor, user, specialized, task)"),
    bound_user_key: str = typer.Option("", "--bound-user", "-b", help="User binding key (for user agent only)"),
    model: str = typer.Option("", "--model", "-m", help="Model to use"),
):
    """Create a new agent configuration."""
    from nanocats.config.loader import load_config, save_agent_config
    from nanocats.config.schema import AgentInstanceConfig

    config = load_config()

    # Map agent type to session policy
    session_policy_map = {
        "user": "per_user",
        "supervisor": "global",
        "specialized": "per_channel",
        "task": "per_task",
    }
    session_policy = session_policy_map.get(agent_type, "per_channel")

    # Validate user binding for user agent
    if agent_type == "user" and not bound_user_key:
        console.print("[yellow]Warning:[/yellow] user agent should have --bound-user key for 1:1 binding")

    # Create agent config
    agent_config = AgentInstanceConfig(
        id=agent_id,
        name=name or agent_id,
        type=agent_type,
        model=model or None,
        bound_user_key=bound_user_key or None,
        session_policy=session_policy,
    )

    save_agent_config(agent_config, config)
    console.print(f"[green]✓[/green] Created agent config: ~/.nanocats/agents/{agent_id}.json")
    console.print(f"  Type: {agent_type}")
    console.print(f"  Session policy: {session_policy}")
    if bound_user_key:
        console.print(f"  Bound user: {bound_user_key}")
    console.print("Edit the file to configure channels, MCP, skills, etc.")


@swarm_app.command("mcp")
def swarm_mcp(
    action: str = typer.Argument(..., help="Action: list, install, uninstall"),
    name: str | None = typer.Argument(None, help="MCP server name"),
    command: str = typer.Option("", "--command", "-c", help="MCP command (for install)"),
    args: str = typer.Option("", "--args", "-a", help="MCP args (comma-separated, for install)"),
):
    """Manage MCP registry."""
    from pathlib import Path

    from nanocats.config.loader import load_config
    from nanocats.config.schema import MCPServerConfig
    from nanocats.swarm.mcp_registry import MCPRegistry

    config = load_config()
    registry = MCPRegistry(Path(config.agents.swarm.mcp_registry_path))

    if action == "list":
        servers = registry.list_servers()
        if servers:
            console.print("Installed MCP servers:")
            for s in servers:
                info = registry.get_server_info(s)
                if info:
                    cmd_str = info["command"] or info["url"] or "unknown"
                    console.print(f"  - {s}: {cmd_str}")
        else:
            console.print("No MCP servers installed.")

    elif action == "install":
        if not name or not command:
            console.print("[red]Error: --name and --command required for install[/red]")
            raise typer.Exit(1)

        mcp_config = MCPServerConfig(
            command=command,
            args=args.split(",") if args else [],
        )
        registry.install_server(name, mcp_config)
        console.print(f"[green]✓[/green] Installed MCP server: {name}")

    elif action == "uninstall":
        if not name:
            console.print("[red]Error: --name required for uninstall[/red]")
            raise typer.Exit(1)

        if registry.uninstall_server(name):
            console.print(f"[green]✓[/green] Uninstalled MCP server: {name}")
        else:
            console.print(f"[red]Error: MCP server '{name}' not found[/red]")

    else:
        console.print(f"[red]Unknown action: {action}[/red]")
        console.print("Valid actions: list, install, uninstall")


# ============================================================================
# Agent Commands
# ============================================================================


# ============================================================================
# Channel Commands
# ============================================================================


channels_app = typer.Typer(help="Manage channels")
app.add_typer(channels_app, name="channels")


@channels_app.command("status")
def channels_status():
    """Show channel status."""
    from nanocats.config.loader import load_config

    config = load_config()

    table = Table(title="Channel Status")
    table.add_column("Channel", style="cyan")
    table.add_column("Enabled", style="green")
    table.add_column("Configuration", style="yellow")

    # WhatsApp
    wa = config.channels.whatsapp
    table.add_row(
        "WhatsApp",
        "✓" if wa.enabled else "✗",
        wa.bridge_url
    )

    dc = config.channels.discord
    table.add_row(
        "Discord",
        "✓" if dc.enabled else "✗",
        dc.gateway_url
    )

    # Feishu
    fs = config.channels.feishu
    fs_config = f"app_id: {fs.app_id[:10]}..." if fs.app_id else "[dim]not configured[/dim]"
    table.add_row(
        "Feishu",
        "✓" if fs.enabled else "✗",
        fs_config
    )

    # Mochat
    mc = config.channels.mochat
    mc_base = mc.base_url or "[dim]not configured[/dim]"
    table.add_row(
        "Mochat",
        "✓" if mc.enabled else "✗",
        mc_base
    )

    # Telegram
    tg = config.channels.telegram
    tg_config = f"token: {tg.token[:10]}..." if tg.token else "[dim]not configured[/dim]"
    table.add_row(
        "Telegram",
        "✓" if tg.enabled else "✗",
        tg_config
    )

    # Slack
    slack = config.channels.slack
    slack_config = "socket" if slack.app_token and slack.bot_token else "[dim]not configured[/dim]"
    table.add_row(
        "Slack",
        "✓" if slack.enabled else "✗",
        slack_config
    )

    # DingTalk
    dt = config.channels.dingtalk
    dt_config = f"client_id: {dt.client_id[:10]}..." if dt.client_id else "[dim]not configured[/dim]"
    table.add_row(
        "DingTalk",
        "✓" if dt.enabled else "✗",
        dt_config
    )

    # QQ
    qq = config.channels.qq
    qq_config = f"app_id: {qq.app_id[:10]}..." if qq.app_id else "[dim]not configured[/dim]"
    table.add_row(
        "QQ",
        "✓" if qq.enabled else "✗",
        qq_config
    )

    # Email
    em = config.channels.email
    em_config = em.imap_host if em.imap_host else "[dim]not configured[/dim]"
    table.add_row(
        "Email",
        "✓" if em.enabled else "✗",
        em_config
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
    if not shutil.which("npm"):
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
        subprocess.run(["npm", "install"], cwd=user_bridge, check=True, capture_output=True)

        console.print("  Building...")
        subprocess.run(["npm", "run", "build"], cwd=user_bridge, check=True, capture_output=True)

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
    import subprocess

    from nanocats.config.loader import load_config
    from nanocats.config.paths import get_runtime_subdir

    config = load_config()
    bridge_dir = _get_bridge_dir()

    console.print(f"{__logo__} Starting bridge...")
    console.print("Scan the QR code to connect.\n")

    env = {**os.environ}
    if config.channels.whatsapp.bridge_token:
        env["BRIDGE_TOKEN"] = config.channels.whatsapp.bridge_token
    env["AUTH_DIR"] = str(get_runtime_subdir("whatsapp-auth"))

    try:
        subprocess.run(["npm", "start"], cwd=bridge_dir, check=True, env=env)
    except subprocess.CalledProcessError as e:
        console.print(f"[red]Bridge failed: {e}[/red]")
    except FileNotFoundError:
        console.print("[red]npm not found. Please install Node.js.[/red]")


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

    console.print(f"Config: {config_path} {'[green]✓[/green]' if config_path.exists() else '[red]✗[/red]'}")
    console.print(f"Workspace: {workspace} {'[green]✓[/green]' if workspace.exists() else '[red]✗[/red]'}")

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
                console.print(f"{spec.label}: {'[green]✓[/green]' if has_key else '[dim]not set[/dim]'}")


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
    provider: str = typer.Argument(..., help="OAuth provider (e.g. 'openai-codex', 'github-copilot')"),
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
        console.print(f"[green]✓ Authenticated with OpenAI Codex[/green]  [dim]{token.account_id}[/dim]")
    except ImportError:
        console.print("[red]oauth_cli_kit not installed. Run: pip install oauth-cli-kit[/red]")
        raise typer.Exit(1)


@_register_login("github_copilot")
def _login_github_copilot() -> None:
    import asyncio

    console.print("[cyan]Starting GitHub Copilot device flow...[/cyan]\n")

    async def _trigger():
        from litellm import acompletion
        await acompletion(model="github_copilot/gpt-4o", messages=[{"role": "user", "content": "hi"}], max_tokens=1)

    try:
        asyncio.run(_trigger())
        console.print("[green]✓ Authenticated with GitHub Copilot[/green]")
    except Exception as e:
        console.print(f"[red]Authentication error: {e}[/red]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
