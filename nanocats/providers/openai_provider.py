"""OpenAI SDK Provider for nanocat.

This provider directly uses the OpenAI SDK to make API calls,
which provides better compatibility with providers that implement
the OpenAI API format (like MiniMax).
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator

from openai import AsyncOpenAI

from loguru import logger
from nanocats.providers.base import LLMProvider, LLMResponse, GenerationSettings, ToolCallRequest


@dataclass
class OpenAIProvider(LLMProvider):
    """Provider that uses OpenAI SDK directly.
    
    This provider is compatible with any API that implements the
    OpenAI Chat Completion API, including:
    - MiniMax
    - OpenAI
    - OpenRouter
    - And other OpenAI-compatible providers
    """
    
    api_key: str | None = None
    api_base: str | None = None
    default_model: str = "gpt-4"
    extra_headers: dict[str, str] | None = None
    
    _client: AsyncOpenAI | None = field(default=None, init=False, repr=False)
    generation: GenerationSettings = field(default_factory=GenerationSettings)
    
    def __post_init__(self):
        """Initialize the OpenAI client."""
        self._client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.api_base,
            timeout=120.0,
        )
    
    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict | None = None,
        **kwargs
    ) -> LLMResponse:
        """Send a chat completion request.
        
        Args:
            messages: List of message dictionaries
            tools: Optional list of tool definitions
            tool_choice: Tool choice configuration
            **kwargs: Additional parameters like temperature, max_tokens, etc.
            
        Returns:
            LLMResponse object with the model's response
        """
        # Build request parameters
        params = {
            "model": self.default_model,
            "messages": messages,
            **kwargs
        }
        
        if tools:
            params["tools"] = tools
        if tool_choice:
            params["tool_choice"] = tool_choice
        
        # Make the API call
        response = await self._client.chat.completions.create(**params)
        
        # Extract response data
        message = response.choices[0].message
        content = message.content or ""
        
        # Extract tool calls if present
        tool_calls: list[ToolCallRequest] = []
        if message.tool_calls:
            for tc in message.tool_calls:
                # Handle both dict and object access
                func = tc.function if hasattr(tc, 'function') else tc.get('function', {})
                if isinstance(func, dict):
                    func_name = func.get('name', '')
                    func_args_raw = func.get('arguments', '')
                else:
                    func_name = func.name
                    func_args_raw = func.arguments
                # Parse arguments (may be string or dict)
                if isinstance(func_args_raw, str):
                    import json_repair
                    func_args = json_repair.loads(func_args_raw)
                else:
                    func_args = func_args_raw or {}
                tool_calls.append(
                    ToolCallRequest(
                        id=tc.id,
                        name=func_name,
                        arguments=func_args
                    )
                )
        
        # Extract usage information
        usage = {}
        if response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens or 0,
                "completion_tokens": response.usage.completion_tokens or 0,
                "total_tokens": response.usage.total_tokens or 0,
            }
            # Extract cache info from prompt_tokens_details (MiniMax/OpenAI format)
            if hasattr(response.usage, 'prompt_tokens_details') and response.usage.prompt_tokens_details:
                ptd = response.usage.prompt_tokens_details
                if hasattr(ptd, 'cached_tokens') and ptd.cached_tokens:
                    usage["cached_tokens"] = ptd.cached_tokens
            # Also check prompt_token_details (alternative format)
            if hasattr(response.usage, 'prompt_token_details') and response.usage.prompt_token_details:
                ptd = response.usage.prompt_token_details
                if hasattr(ptd, 'cached_tokens') and ptd.cached_tokens:
                    usage["cached_tokens"] = ptd.cached_tokens
            # Anthropic format
            if hasattr(response.usage, 'cache_read_input_tokens'):
                usage["cache_read_input_tokens"] = response.usage.cache_read_input_tokens
            if hasattr(response.usage, 'cache_creation_input_tokens'):
                usage["cache_creation_input_tokens"] = response.usage.cache_creation_input_tokens
        
        # Extract reasoning content (for models like MiniMax-M2.5)
        reasoning_content = None
        if hasattr(message, 'reasoning_content'):
            reasoning_content = message.reasoning_content
        
        # Extract thinking blocks (for models with reasoning)
        thinking_blocks = None
        if hasattr(message, 'thinking_blocks') and message.thinking_blocks:
            thinking_blocks = [
                {
                    "type": tb.type,
                    "thinking": getattr(tb, 'thinking', None),
                    "signature": getattr(tb, 'signature', None),
                }
                for tb in message.thinking_blocks
            ]
        
        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=response.choices[0].finish_reason or "stop",
            usage=usage,
            reasoning_content=reasoning_content,
            thinking_blocks=thinking_blocks,
        )
    
    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict | None = None,
        **kwargs
    ) -> AsyncGenerator[tuple[str, bool], None]:
        """Stream a chat completion request.
        
        Args:
            messages: List of message dictionaries
            tools: Optional list of tool definitions
            tool_choice: Tool choice configuration
            **kwargs: Additional parameters
            
        Yields:
            Tuples of (content, is_final) where is_final indicates if this is the last chunk
        """
        params = {
            "model": self.default_model,
            "messages": messages,
            "stream": True,
            **kwargs
        }
        
        if tools:
            params["tools"] = tools
        if tool_choice:
            params["tool_choice"] = tool_choice
        
        stream = await self._client.chat.completions.create(**params)
        
        async for chunk in stream:
            delta = chunk.choices[0].delta
            
            # Yield content if present
            if delta.content:
                yield delta.content, False
            
            # Check for tool calls
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    # Handle both dict and object access
                    func = tc.function if hasattr(tc, 'function') else tc.get('function', {})
                    if isinstance(func, dict):
                        func_name = func.get('name', '')
                        func_args = func.get('arguments', '')
                    else:
                        func_name = func.name
                        func_args = func.arguments
                    yield f"[TOOL_CALL:{func_name}:{func_args or ''}]", False
            
            # Check if this is the last chunk
            if chunk.choices[0].finish_reason:
                yield "", True
    
    async def close(self):
        """Close the client connection."""
        if self._client:
            await self._client.close()
    
    @property
    def supports_streaming(self) -> bool:
        """Check if this provider supports streaming."""
        return True
    
    def get_default_model(self) -> str:
        """Get the default model for this provider."""
        return self.default_model
