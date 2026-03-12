"""Test AgentManager configuration loading."""

from pathlib import Path

from nanocats.config.loader import load_config, load_agent_config
from nanocats.providers.registry import find_by_model


def test_load_minimax_config():
    """Test that MiniMax configuration is loaded correctly."""
    config = load_config()
    
    # Check default model
    default_model = config.agents.defaults.model
    print(f"\nDefault model: {default_model}")
    
    # Find provider spec
    spec = find_by_model(default_model)
    assert spec is not None, f"No provider found for model: {default_model}"
    
    print(f"Provider name: {spec.name}")
    print(f"Provider env_key: {spec.env_key}")
    print(f"Provider default_api_base: {spec.default_api_base}")
    print(f"Provider litellm_prefix: {spec.litellm_prefix}")
    
    # Check provider config
    assert hasattr(config.providers, spec.name), f"No config for provider: {spec.name}"
    provider_config = getattr(config.providers, spec.name)
    
    api_key = provider_config.api_key if hasattr(provider_config, 'api_key') else None
    api_base = provider_config.api_base if hasattr(provider_config, 'api_base') else None
    
    # Mask API key for security
    masked_key = "***" if api_key else None
    print(f"\nConfigured API Key: {masked_key}")
    print(f"Configured API Base: {api_base}")
    
    # Validate
    assert api_key is not None and len(api_key) > 0, "API Key is empty!"
    
    # Use default_api_base if not configured
    if not api_base:
        api_base = spec.default_api_base
        print(f"Using default API Base: {api_base}")
    
    assert api_base is not None and len(api_base) > 0, "API Base is empty!"
    
    print("\n✅ Configuration test passed!")
    return {
        "provider": spec.name,
        "env_key": spec.env_key,
        "api_key": "***",
        "api_base": api_base,
        "model": default_model,
    }


def test_agent_manager_provider_creation():
    """Test AgentManager provider creation logic."""
    from nanocats.web.backend.agent_manager import AgentManager
    
    manager = AgentManager()
    
    # Simulate _create_provider logic
    config = load_config()
    agent_id = "admin"  # Test with admin agent
    
    # Get model from config
    model = config.agents.defaults.model
    print(f"\nModel from config: {model}")
    
    # Find provider spec
    spec = find_by_model(model)
    assert spec is not None
    
    print(f"Provider: {spec.name}")
    print(f"Env key: {spec.env_key}")
    print(f"Default API base: {spec.default_api_base}")
    
    # Get provider config
    provider_config = getattr(config.providers, spec.name)
    api_key = provider_config.api_key if hasattr(provider_config, 'api_key') else None
    api_base = provider_config.api_base if hasattr(provider_config, 'api_base') else None
    
    # Mask API key
    print(f"\nAPI Key from config: {'Yes (***)' if api_key else 'No'}")
    print(f"API Base from config: {api_base if api_base else 'None (will use default)'}")
    
    # Check if we need to use default
    if not api_base and spec.default_api_base:
        api_base = spec.default_api_base
        print(f"Using default API base: {api_base}")
    
    # Validate
    assert api_key, "API Key is missing!"
    assert api_base, "API Base is missing!"
    
    print("\n✅ AgentManager provider creation test passed!")


def test_minimax_api_call(api_key=None):
    """Test actual API call to MiniMax to verify API Key works."""
    import os
    import asyncio
    from nanocats.providers.openai_provider import OpenAIProvider
    from nanocats.config.loader import load_config
    
    config = load_config()
    model = "MiniMax-M2.5"
    
    # Get API key from config if not provided
    if api_key is None:
        provider_config = getattr(config.providers, "minimax")
        api_key = provider_config.api_key if hasattr(provider_config, 'api_key') else None
    
    if not api_key:
        print("\n❌ No API Key provided!")
        return False
    
    # Try new MiniMax endpoint (from official docs)
    api_base = "https://api.minimaxi.chat/v1"
    
    print(f"\nTesting MiniMax API call (new endpoint):")
    print(f"Model: {model}")
    print(f"API Base: {api_base}")
    print(f"API Key: ***")
    
    # Set env vars
    os.environ["MINIMAX_API_KEY"] = api_key
    os.environ["OPENAI_API_KEY"] = api_key
    
    # Create provider
    provider = OpenAIProvider(
        api_key=api_key,
        api_base=api_base,
        default_model=model
    )
    
    # Test API call
    async def make_call():
        try:
            response = await provider.chat_with_retry(
                messages=[{"role": "user", "content": "Hello, this is a test."}],
                model=f"minimax/{model}"
            )
            print(f"\n✅ API call successful!")
            print(f"Response: {response.content[:100]}..." if response.content else "No content")
            return True
        except Exception as e:
            print(f"\n❌ API call failed!")
            print(f"Error: {e}")
            return False
    
    result = asyncio.run(make_call())
    return result


def test_minimax_as_anthropic(api_key=None):
    """Test MiniMax using Anthropic SDK format (as per official docs)."""
    import os
    import asyncio
    from nanocats.providers.openai_provider import OpenAIProvider
    from nanocats.config.loader import load_config
    
    config = load_config()
    
    # Get API key from config if not provided
    if api_key is None:
        provider_config = getattr(config.providers, "minimax")
        api_key = provider_config.api_key if hasattr(provider_config, 'api_key') else None
    
    if not api_key:
        print("\n❌ No API Key provided!")
        return False
    
    # MiniMax official API base for Anthropic SDK
    api_base = "https://api.minimaxi.com/anthropic"  # Correct Anthropic endpoint
    model = "MiniMax-M2.5"
    
    print(f"\nTesting MiniMax API call (Anthropic format with correct base URL):")
    print(f"Model: {model}")
    print(f"API Base: {api_base}")
    print(f"API Key: ***")
    
    # Set env vars
    os.environ["ANTHROPIC_API_KEY"] = api_key
    os.environ["MINIMAX_API_KEY"] = api_key
    
    # Create provider
    provider = OpenAIProvider(
        api_key=api_key,
        api_base=api_base,
        default_model=model
    )
    
    # Test API call
    async def make_call():
        try:
            response = await provider.chat_with_retry(
                messages=[{"role": "user", "content": "Hello, this is a test."}],
                model=f"anthropic/{model}"
            )
            print(f"\n✅ API call successful!")
            print(f"Response: {response.content[:100]}..." if response.content else "No content")
            return True
        except Exception as e:
            print(f"\n❌ API call failed!")
            print(f"Error: {e}")
            return False
    
    result = asyncio.run(make_call())
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("Testing MiniMax Configuration")
    print("=" * 60)
    result = test_load_minimax_config()
    print("\n" + "=" * 60)
    print("Testing AgentManager Provider Creation")
    print("=" * 60)
    test_agent_manager_provider_creation()
    print("\n" + "=" * 60)
    print("Testing MiniMax API Call (OpenAI format)")
    print("=" * 60)
    api_result1 = test_minimax_api_call()
    
    print("\n" + "=" * 60)
    print("Testing MiniMax API Call (Anthropic format)")
    print("=" * 60)
    api_result2 = test_minimax_as_anthropic()
    
    print("\n" + "=" * 60)
    if api_result1 or api_result2:
        print("At least one API call succeeded!")
    else:
        print("Both API calls failed - check API Key validity")
    print("=" * 60)
