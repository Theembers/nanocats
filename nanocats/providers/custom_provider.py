"""Direct OpenAI-compatible provider — bypasses LiteLLM."""

from __future__ import annotations

import uuid
from typing import Any
from loguru import logger

import json_repair
from openai import AsyncOpenAI

from nanocats.providers.base import LLMProvider, LLMResponse, ToolCallRequest


class CustomProvider(LLMProvider):

    def __init__(
        self,
        api_key: str = "no-key",
        api_base: str = "http://localhost:8000/v1",
        default_model: str = "default",
        supports_prompt_caching: bool = False,
    ):
        super().__init__(api_key, api_base)
        self.default_model = default_model
        self.supports_prompt_caching = supports_prompt_caching
        # Keep affinity stable for this provider instance to improve backend cache locality.
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=api_base,
            default_headers={"x-session-affinity": uuid.uuid4().hex},
        )

    def _apply_cache_control(
        self,
        messages: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Apply cache_control to system messages for prompt caching."""
        new_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                content = msg["content"]
                if isinstance(content, str):
                    new_content = [
                        {"type": "text", "text": content, "cache_control": {"type": "ephemeral"}}
                    ]
                else:
                    new_content = list(content)
                    new_content[-1] = {**new_content[-1], "cache_control": {"type": "ephemeral"}}
                new_messages.append({**msg, "content": new_content})
            else:
                new_messages.append(msg)
        return new_messages

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        reasoning_effort: str | None = None,
        tool_choice: str | dict[str, Any] | None = None,
    ) -> LLMResponse:
        # Apply cache control if supported
        if self.supports_prompt_caching:
            messages = self._apply_cache_control(messages)

        kwargs: dict[str, Any] = {
            "model": model or self.default_model,
            "messages": self._sanitize_empty_content(messages),
            "max_tokens": max(1, max_tokens),
            "temperature": temperature,
        }
        if reasoning_effort:
            kwargs["reasoning_effort"] = reasoning_effort
        if tools:
            kwargs.update(tools=tools, tool_choice=tool_choice or "auto")
        try:
            return self._parse(await self._client.chat.completions.create(**kwargs))
        except Exception as e:
            return LLMResponse(content=f"Error: {e}", finish_reason="error")

    def _parse(self, response: Any) -> LLMResponse:
        choice = response.choices[0]
        msg = choice.message
        tool_calls = [
            ToolCallRequest(
                id=tc.id,
                name=tc.function.name,
                arguments=json_repair.loads(tc.function.arguments)
                if isinstance(tc.function.arguments, str)
                else tc.function.arguments,
            )
            for tc in (msg.tool_calls or [])
        ]
        u = response.usage
        usage: dict[str, Any] = {}
        if u:
            # Extract basic tokens
            usage = {
                "prompt_tokens": u.prompt_tokens,
                "completion_tokens": u.completion_tokens,
                "total_tokens": u.total_tokens,
            }
            # Extract cache tokens from prompt_tokens_details
            if hasattr(u, "prompt_tokens_details") and u.prompt_tokens_details:
                ptd = u.prompt_tokens_details
                usage["cached_tokens"] = getattr(ptd, "cached_tokens", 0) or 0
                usage["audio_tokens"] = getattr(ptd, "audio_tokens", 0) or 0

            logger.info("[Token] prompt={} completion={} total={} cached={} audio={}",
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
                usage.get("total_tokens", 0),
                usage.get("cached_tokens", 0),
                usage.get("audio_tokens", 0),
            )

        
        return LLMResponse(
            content=msg.content,
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason or "stop",
            usage=usage,
            reasoning_content=getattr(msg, "reasoning_content", None) or None,
        )

    def get_default_model(self) -> str:
        return self.default_model

