"""Tool registry for dynamic tool management."""

from typing import Any

from nanocats.agent.tools.base import Tool
from nanocats.db import record_log


class ToolRegistry:
    """
    Registry for agent tools.

    Allows dynamic registration and execution of tools.
    """

    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        """Register a tool."""
        self._tools[tool.name] = tool

    def unregister(self, name: str) -> None:
        """Unregister a tool by name."""
        self._tools.pop(name, None)

    def get(self, name: str) -> Tool | None:
        """Get a tool by name."""
        return self._tools.get(name)

    def has(self, name: str) -> bool:
        """Check if a tool is registered."""
        return name in self._tools

    def get_definitions(self) -> list[dict[str, Any]]:
        """Get all tool definitions in OpenAI format."""
        return [tool.to_schema() for tool in self._tools.values()]

    async def execute(self, name: str, params: dict[str, Any]) -> str:
        """Execute a tool by name with given parameters."""
        _HINT = "\n\n[Analyze the error above and try a different approach.]"

        tool = self._tools.get(name)
        if not tool:
            return f"Error: Tool '{name}' not found. Available: {', '.join(self.tool_names)}"

        try:
            params = tool.cast_params(params)

            errors = tool.validate_params(params)
            if errors:
                return f"Error: Invalid parameters for tool '{name}': " + "; ".join(errors) + _HINT

            import time

            start_time = time.time()
            result = await tool.execute(**params)
            duration_ms = int((time.time() - start_time) * 1000)

            record_log(
                level="DEBUG",
                log_type="tool",
                message=f"Tool executed: {name}",
                tool_name=name,
                metadata={
                    "params": params,
                    "result_length": len(result) if isinstance(result, str) else 0,
                    "duration_ms": duration_ms,
                },
            )

            if isinstance(result, str) and result.startswith("Error"):
                return result + _HINT
            return result
        except Exception as e:
            record_log(
                level="ERROR",
                log_type="tool",
                message=f"Tool execution error: {name}: {str(e)}",
                tool_name=name,
                metadata={"params": params, "error": str(e)},
            )
            return f"Error executing {name}: {str(e)}" + _HINT

    @property
    def tool_names(self) -> list[str]:
        """Get list of registered tool names."""
        return list(self._tools.keys())

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools
