"""Ollama LLM provider with streaming support."""

import json
import logging
from typing import AsyncGenerator

import httpx

from backend.providers.base import LLMProvider

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "http://localhost:11434"


class OllamaProvider(LLMProvider):
    """Ollama provider for local models."""

    def __init__(self, base_url: str = DEFAULT_BASE_URL) -> None:
        self._base_url = base_url

    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        model_id: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream text chunks from an Ollama model."""
        # Build messages with system prompt prepended
        all_messages = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]

        payload = {
            "model": model_id,
            "messages": all_messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "top_p": top_p,
                "num_predict": max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if data.get("done"):
                        break
                    text = data.get("message", {}).get("content", "")
                    if text:
                        yield text

    async def list_models(self) -> list[dict]:
        """List locally available Ollama models."""
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                response = await client.get(f"{self._base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [
                    {
                        "model_id": f"ollama:{m['name']}",
                        "model_name": m["name"],
                        "provider": "Ollama (local)",
                    }
                    for m in data.get("models", [])
                ]
        except Exception as exc:
            logger.warning("Could not connect to Ollama: %s", exc)
            return []
