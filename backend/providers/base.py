"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator


class LLMProvider(ABC):
    """Abstract interface for LLM providers.

    All providers must implement generate_stream, which yields
    text chunks as they arrive from the model.
    """

    @abstractmethod
    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        model_id: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream text chunks from the model.

        Args:
            messages: List of {"role": str, "content": str} dicts.
            system_prompt: System-level instruction for the model.
            model_id: Provider-specific model identifier.
            temperature: Sampling temperature (0.0 to 1.0).
            max_tokens: Maximum tokens to generate.
            top_p: Nucleus sampling parameter (0.0 to 1.0).

        Yields:
            Text chunks as strings.
        """
        ...  # pragma: no cover
