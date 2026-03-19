"""Onboard/setup wizard and provider factory."""

import json
from pathlib import Path

import typer
from rich.console import Console

from nanocats import __logo__
from nanocats.cli._app import app
from nanocats.cli.utils import _interactive_select

console = Console()


def _make_provider(config):
    """Create the appropriate LLM provider from config."""
    from nanocats.providers.base import GenerationSettings
    from nanocats.providers.openai_codex_provider import OpenAICodexProvider
    from nanocats.providers.azure_openai_provider import AzureOpenAIProvider
    from nanocats.providers.registry import find_by_name

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    p = config.get_provider(model)
    spec = find_by_name(provider_name) if provider_name else None

    if provider_name == "openai_codex" or model.startswith("openai-codex/"):
        provider = OpenAICodexProvider(default_model=model)
    elif provider_name == "custom":
        from nanocats.providers.custom_provider import CustomProvider

        provider = CustomProvider(
            api_key=p.api_key if p else "no-key",
            api_base=config.get_api_base(model) or "http://localhost:8000/v1",
            default_model=model,
        )
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


@app.command()
def onboard():
    """Interactive setup wizard for nanocats."""
    from nanocats.config.loader import get_config_path, load_config, save_config
    from nanocats.config.schema import AgentType
    from nanocats.providers.registry import PROVIDERS

    console.print(f"\n[bold cyan]{__logo__} Setup Wizard[/bold cyan]\n")
    console.print("[dim]This wizard will help you configure nanocats:\n[/dim]")
    console.print("  [yellow]1.[/yellow] Model provider configuration")
    console.print("  [yellow]2.[/yellow] Model selection")
    console.print("  [yellow]3.[/yellow] Master agent creation")
    console.print("  [yellow]4.[/yellow] Channel configuration\n")

    console.print("[bold cyan]━━━ Step 1/3: Model Provider ━━━[/bold cyan]\n")

    config_path = get_config_path()
    if config_path.exists():
        config = load_config()
        console.print(f"[dim]Using existing config: {config_path}[/dim]\n")
    else:
        config = None
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

        console.print(f"\n[bold cyan]━━━ Step 2/3: Model Selection ━━━[/bold cyan]\n")

        models = selected_provider.recommended_models
        if models:
            model_options = [desc for _, desc in models]
            model_options.append("Custom (enter manually)")
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

    console.print(f"\n[bold cyan]━━━ Step 3/3: Master Agent ━━━[/bold cyan]\n")

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

    if selected_agent_idx == 0:
        agent_id = typer.prompt("Agent ID", type=str, default="master", show_default=True)
        agent_name = typer.prompt("Agent Name", type=str, default="Master Agent", show_default=True)

        admin_config_dir.mkdir(parents=True, exist_ok=True)

        agent_data = _create_agent_config(
            agent_id=agent_id,
            name=agent_name,
            agent_type=AgentType.ADMIN,
            model=selected_model,
        )

        admin_config_path = admin_config_dir / f"{agent_id}.json"
        with open(admin_config_path, "w", encoding="utf-8") as f:
            json.dump(agent_data, f, indent=2, ensure_ascii=False)

        console.print(f"\n[green]✓[/green] Created agent: [bold]{agent_id}[/bold]\n")

    else:
        console.print(f"\n[dim]Skipped agent creation[/dim]\n")

    console.print(f"\n[bold cyan]━━━ Setup Complete ━━━[/bold cyan]\n")
    console.print(f"[bold]Configuration:[/bold]")
    console.print(f"  [dim]Config:[/dim] [cyan]{config_path}[/cyan]")
    console.print(f"\n[bold]Provider:[/bold]")
    console.print(f"  [dim]Name:[/dim] [green]{provider_label or 'existing'}[/green]")
    console.print(f"  [dim]Model:[/dim] [green]{selected_model or 'existing'}[/green]")

    if selected_agent_idx == 0:
        console.print(f"\n[bold]Master Agent:[/bold]")
        console.print(f"  [dim]ID:[/dim] [cyan]{agent_id}[/cyan]")
        console.print(f"  [dim]Name:[/dim] [cyan]{agent_name}[/cyan]")

    console.print(f"\n[bold green]✓ Setup complete![/bold green]\n")
    console.print("[dim]Next steps:[/dim]")
    console.print("  [cyan]nanocats help[/cyan] - View all available commands")
    console.print("  [cyan]nanocats gateway[/cyan] - Start the gateway\n")


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
