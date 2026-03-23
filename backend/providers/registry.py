"""Provider registry — returns the right LLM provider by name."""

from backend.providers.base import LLMProvider
from backend.providers.bedrock import BedrockProvider
from backend.providers.ollama import OllamaProvider

_PROVIDERS: dict[str, type[LLMProvider]] = {
    "bedrock": BedrockProvider,
    "ollama": OllamaProvider,
}

_instances: dict[str, LLMProvider] = {}


def get_provider(name: str = "bedrock") -> LLMProvider:
    """Get a cached provider instance by name.

    Args:
        name: Provider name ('bedrock' or 'ollama').

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


def provider_for_model(model_id: str) -> LLMProvider:
    """Determine the right provider based on model ID prefix.

    Ollama models are prefixed with 'ollama:'. Everything else
    routes to Bedrock.
    """
    if model_id.startswith("ollama:"):
        return get_provider("ollama")
    return get_provider("bedrock")


def strip_provider_prefix(model_id: str) -> str:
    """Remove the provider prefix from a model ID.

    'ollama:llama3' -> 'llama3'
    'us.anthropic.claude-sonnet-4-6' -> 'us.anthropic.claude-sonnet-4-6'
    """
    if model_id.startswith("ollama:"):
        return model_id[len("ollama:"):]
    return model_id
