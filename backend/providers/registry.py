"""Provider registry — returns the right LLM provider by name."""

from backend.providers.base import LLMProvider
from backend.providers.bedrock import BedrockProvider

_PROVIDERS: dict[str, type[LLMProvider]] = {
    "bedrock": BedrockProvider,
}

_instances: dict[str, LLMProvider] = {}


def get_provider(name: str = "bedrock") -> LLMProvider:
    """Get a cached provider instance by name.

    Args:
        name: Provider name (currently only 'bedrock').

    Returns:
        An LLMProvider instance.

    Raises:
        ValueError: If the provider name is not registered.
    """
    if name not in _PROVIDERS:
        available = ", ".join(_PROVIDERS.keys())
        raise ValueError(
            f"Unknown provider '{name}'. Available: {available}"
        )

    if name not in _instances:
        _instances[name] = _PROVIDERS[name]()

    return _instances[name]
