"""Agent activity logger for web interface.

This module provides logging capabilities for agent activities
(model calls, tool calls, MCP calls, skill calls) to be displayed
in the web interface logs page.
"""

import json
import sqlite3
from datetime import datetime


def _get_local_timestamp() -> str:
    """Get current timestamp in local timezone."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
from pathlib import Path
from typing import Optional, Any
from contextvars import ContextVar

from nanocats.config.paths import get_data_dir

# Database path (same as main.py)
DATABASE_PATH = get_data_dir() / "web.db"

# Context variable to track current agent ID
_current_agent_id: ContextVar[Optional[str]] = ContextVar('current_agent_id', default=None)


def set_current_agent_id(agent_id: str):
    """Set the current agent ID for logging context."""
    _current_agent_id.set(agent_id)


def get_current_agent_id() -> Optional[str]:
    """Get the current agent ID from logging context."""
    return _current_agent_id.get()


def _get_db():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def log_model_call(
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cost: float = 0.0,
    cached: bool = False,
    error: Optional[str] = None,
    agent_id: Optional[str] = None
):
    """Log a model API call.
    
    Args:
        model: The model name used
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        cost: Estimated cost in USD
        cached: Whether the response was cached
        error: Error message if the call failed
        agent_id: Agent ID (optional, uses context if not provided)
    """
    agent = agent_id or get_current_agent_id() or "unknown"
    
    conn = _get_db()
    cursor = conn.cursor()
    
    # Log to token_usage table for stats
    try:
        total_tokens = input_tokens + output_tokens
        cursor.execute(
            """INSERT INTO token_usage (timestamp, agent_id, model, prompt_tokens, completion_tokens, total_tokens, cached, cost)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (_get_local_timestamp(), agent, model, input_tokens, output_tokens, total_tokens, 1 if cached else 0, cost)
        )
    except Exception as e:
        # Token usage table might not exist yet, log to console for debugging
        print(f"Failed to log token usage: {e}")
    
    details = {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost": cost,
        "cached": cached,
    }
    if error:
        details["error"] = error
    
    cursor.execute(
        """INSERT INTO logs (timestamp, agent_id, level, category, message, details)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (_get_local_timestamp(), agent, "INFO" if not error else "ERROR", "model", 
         f"Model call: {model}", json.dumps(details))
    )
    
    conn.commit()
    conn.close()


def log_tool_call(
    tool_name: str,
    arguments: dict,
    result: Optional[Any] = None,
    error: Optional[str] = None,
    duration_ms: Optional[int] = None,
    agent_id: Optional[str] = None
):
    """Log a tool execution.
    
    Args:
        tool_name: Name of the tool
        arguments: Tool arguments
        result: Tool result (will be truncated)
        error: Error message if the call failed
        duration_ms: Execution duration in milliseconds
        agent_id: Agent ID (optional, uses context if not provided)
    """
    agent = agent_id or get_current_agent_id() or "unknown"
    
    conn = _get_db()
    cursor = conn.cursor()
    
    details = {
        "arguments": arguments,
        "duration_ms": duration_ms,
    }
    if result is not None:
        # Truncate result to avoid huge logs
        result_str = str(result)[:1000] if len(str(result)) > 1000 else result
        details["result"] = result_str
    if error:
        details["error"] = error
    
    cursor.execute(
        """INSERT INTO logs (timestamp, agent_id, level, category, message, details)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (_get_local_timestamp(), agent, "INFO" if not error else "ERROR", "tool",
         f"Tool call: {tool_name}", json.dumps(details, ensure_ascii=False))
    )
    
    conn.commit()
    conn.close()


def log_mcp_call(
    server_name: str,
    tool_name: str,
    arguments: dict,
    result: Optional[Any] = None,
    error: Optional[str] = None,
    duration_ms: Optional[int] = None,
    agent_id: Optional[str] = None
):
    """Log an MCP tool execution.
    
    Args:
        server_name: MCP server name
        tool_name: Name of the tool
        arguments: Tool arguments
        result: Tool result (will be truncated)
        error: Error message if the call failed
        duration_ms: Execution duration in milliseconds
        agent_id: Agent ID (optional, uses context if not provided)
    """
    agent = agent_id or get_current_agent_id() or "unknown"
    
    conn = _get_db()
    cursor = conn.cursor()
    
    details = {
        "server": server_name,
        "tool": tool_name,
        "arguments": arguments,
        "duration_ms": duration_ms,
    }
    if result is not None:
        result_str = str(result)[:1000] if len(str(result)) > 1000 else result
        details["result"] = result_str
    if error:
        details["error"] = error
    
    cursor.execute(
        """INSERT INTO logs (timestamp, agent_id, level, category, message, details)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (_get_local_timestamp(), agent, "INFO" if not error else "ERROR", "mcp",
         f"MCP call: {server_name}/{tool_name}", json.dumps(details, ensure_ascii=False))
    )
    
    conn.commit()
    conn.close()


def log_skill_call(
    skill_name: str,
    arguments: dict,
    result: Optional[Any] = None,
    error: Optional[str] = None,
    duration_ms: Optional[int] = None,
    agent_id: Optional[str] = None
):
    """Log a skill execution.
    
    Args:
        skill_name: Name of the skill
        arguments: Skill arguments
        result: Skill result (will be truncated)
        error: Error message if the call failed
        duration_ms: Execution duration in milliseconds
        agent_id: Agent ID (optional, uses context if not provided)
    """
    agent = agent_id or get_current_agent_id() or "unknown"
    
    conn = _get_db()
    cursor = conn.cursor()
    
    details = {
        "arguments": arguments,
        "duration_ms": duration_ms,
    }
    if result is not None:
        result_str = str(result)[:1000] if len(str(result)) > 1000 else result
        details["result"] = result_str
    if error:
        details["error"] = error
    
    cursor.execute(
        """INSERT INTO logs (timestamp, agent_id, level, category, message, details)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (_get_local_timestamp(), agent, "INFO" if not error else "ERROR", "skill",
         f"Skill call: {skill_name}", json.dumps(details, ensure_ascii=False))
    )
    
    conn.commit()
    conn.close()


def get_log_stats(agent_id: Optional[str] = None) -> dict:
    """Get statistics for logs.
    
    Returns:
        Dict with counts for each category
    """
    conn = _get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT category, COUNT(*) as count 
        FROM logs 
        WHERE 1=1
    """
    params = []
    
    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    
    query += " GROUP BY category"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    stats = {
        "model": 0,
        "tool": 0,
        "mcp": 0,
        "skill": 0,
        "chat": 0,
        "config": 0,
    }
    for row in rows:
        stats[row["category"]] = row["count"]
    
    return stats
