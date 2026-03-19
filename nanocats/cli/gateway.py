"""Gateway service command."""

import asyncio
import signal
import subprocess
import sys

import typer
from rich.console import Console

from nanocats import __logo__
from nanocats.cli._app import app
from nanocats.cli.utils import _load_runtime_config, _print_deprecated_memory_window_notice

console = Console()


@app.command()
def gateway(
    port: int | None = typer.Option(None, "--port", "-p", help="Gateway port"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose output"),
    config: str | None = typer.Option(None, "--config", "-c", help="Path to config file"),
):
    """Start the nanocats swarm gateway."""
    from nanocats.bus.queue import MessageBus
    from nanocats.channels.manager import ChannelManager
    from nanocats.cli.onboard import _make_provider
    from nanocats.swarm.manager import SwarmManager

    if verbose:
        import logging

        logging.basicConfig(level=logging.DEBUG)

    config = _load_runtime_config(config)
    _print_deprecated_memory_window_notice(config)
    port = port if port is not None else config.gateway.port

    console.print(f"{__logo__} Starting nanocats swarm gateway on port {port}...")
    bus = MessageBus()
    provider = _make_provider(config)

    swarm = SwarmManager(bus=bus, provider=provider)
    channel_manager = ChannelManager(config, bus, agent_registry=swarm.registry)

    channels = channel_manager

    if channels.enabled_channels:
        console.print(f"[green]✓[/green] Channels enabled: {', '.join(channels.enabled_channels)}")
    else:
        console.print("[yellow]Warning: No channels enabled[/yellow]")

    console.print(f"[green]✓[/green] Swarm: {len(swarm.registry.get_all())} agents configured")
    console.print("[bold]🚀 Starting services...[/bold]")

    async def run():
        shutdown_event = asyncio.Event()
        webui_proc: subprocess.Popen | None = None
        db = None

        webui_cmd = [
            sys.executable,
            "-m",
            "nanocats",
            "webui",
            "--port",
            "15651",
            "--host",
            "0.0.0.0",
        ]

        webui_proc = subprocess.Popen(
            webui_cmd,
            stdout=None,
            stderr=None,
            start_new_session=True,
        )
        console.print(f"[dim]Web API 已启动 → http://localhost:15651[/dim]")
        console.print(f"[dim]WebUI 进程 PID: {webui_proc.pid}[/dim]")

        def signal_handler(signum, frame):
            nonlocal shutdown_event
            if shutdown_event.is_set():
                console.print("\n[red]第二次 Ctrl+C → 强制退出！[/red]")
                sys.exit(130)
            console.print("\nReceived signal, shutting down...")
            shutdown_event.set()

        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda s=sig: signal_handler(s, None))

        from nanocats.db import Database

        db = await Database.get_instance()
        console.print("[green]✓[/green] Database initialized")

        swarm_task = asyncio.create_task(swarm.start(), name="swarm")
        channels_task = asyncio.create_task(channels.start_all(), name="channels")
        server_tasks = [swarm_task, channels_task]

        try:
            await shutdown_event.wait()
            console.print("[yellow]正在优雅关闭所有服务...[/yellow]")

            for task in server_tasks:
                if not task.done():
                    task.cancel()

            await asyncio.wait(server_tasks, timeout=8.0)

            if webui_proc:
                try:
                    webui_proc.terminate()
                    await asyncio.wait_for(
                        asyncio.get_running_loop().run_in_executor(None, webui_proc.wait),
                        timeout=3.0,
                    )
                except asyncio.TimeoutError:
                    webui_proc.kill()
                    console.print("[yellow]WebUI 已强制 kill[/yellow]")

        except asyncio.CancelledError:
            pass
        finally:
            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        swarm.stop(),
                        channels.stop_all(),
                        db.close() if db is not None else asyncio.sleep(0),
                        return_exceptions=True,
                    ),
                    timeout=10.0,
                )
            except asyncio.TimeoutError:
                console.print("[red]清理超时，部分资源可能未释放[/red]")
            except Exception as e:
                console.print(f"[red]清理异常: {e}[/red]")

            console.print("[green]✅ Gateway 已完全停止[/green]")
            sys.stdout.flush()

    asyncio.run(run())
