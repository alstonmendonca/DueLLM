"""AWS Bedrock LLM provider with streaming support."""

import asyncio
import json
import logging
from typing import AsyncGenerator

import boto3
from botocore.exceptions import ClientError

from backend.config import get_settings
from backend.providers.base import LLMProvider

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
BASE_DELAY = 1.0


def _is_claude_model(model_id: str) -> bool:
    return "anthropic.claude" in model_id


class BedrockProvider(LLMProvider):
    """AWS Bedrock provider supporting Claude, Llama, and Mistral models."""

    def __init__(self) -> None:
        settings = get_settings()
        session_kwargs: dict = {"region_name": settings.aws_region}
        if settings.aws_access_key_id:
            session_kwargs["aws_access_key_id"] = settings.aws_access_key_id
            session_kwargs["aws_secret_access_key"] = (
                settings.aws_secret_access_key
            )
        session = boto3.Session(**session_kwargs)
        self._client = session.client("bedrock-runtime")
        self._bedrock_client = session.client("bedrock")

    async def generate_stream(
        self,
        messages: list[dict],
        system_prompt: str,
        model_id: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream text chunks from a Bedrock model."""
        for attempt in range(MAX_RETRIES):
            try:
                if _is_claude_model(model_id):
                    async for chunk in self._stream_claude(
                        messages, system_prompt, model_id, temperature, max_tokens, top_p
                    ):
                        yield chunk
                else:
                    async for chunk in self._stream_non_claude(
                        messages, system_prompt, model_id, temperature, max_tokens
                    ):
                        yield chunk
                return
            except ClientError as exc:
                error_code = exc.response["Error"]["Code"]
                if error_code == "ThrottlingException" and attempt < MAX_RETRIES - 1:
                    delay = BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Throttled on attempt %d, retrying in %.1fs",
                        attempt + 1,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise

    async def _stream_claude(
        self,
        messages: list[dict],
        system_prompt: str,
        model_id: str,
        temperature: float,
        max_tokens: int = 4096,
        top_p: float = 1.0,
    ) -> AsyncGenerator[str, None]:
        """Stream using the Claude Messages API format."""
        params: dict = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages,
        }
        # Claude API doesn't allow both temperature and top_p simultaneously
        if top_p < 1.0:
            params["top_p"] = top_p
        else:
            params["temperature"] = temperature
        body = json.dumps(params)

        response = await asyncio.to_thread(
            self._client.invoke_model_with_response_stream,
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=body,
        )

        for event in response["body"]:
            chunk_bytes = event.get("chunk", {}).get("bytes", b"")
            if not chunk_bytes:
                continue
            chunk_data = json.loads(chunk_bytes)
            if chunk_data.get("type") == "content_block_delta":
                text = chunk_data.get("delta", {}).get("text", "")
                if text:
                    yield text

    async def _stream_non_claude(
        self,
        messages: list[dict],
        system_prompt: str,
        model_id: str,
        temperature: float,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Non-streaming fallback for non-Claude models.

        Uses invoke_model and yields the full response as one chunk.
        """
        # Build a chat-style prompt
        prompt_parts = [f"System: {system_prompt}\n"]
        for msg in messages:
            role = "Human" if msg["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {msg['content']}\n")
        prompt_parts.append("Assistant:")
        full_prompt = "\n".join(prompt_parts)

        body_dict: dict = {"prompt": full_prompt, "temperature": temperature}

        if "llama" in model_id.lower() or "meta" in model_id.lower():
            body_dict["max_gen_len"] = max_tokens
        elif "mistral" in model_id.lower() or "mixtral" in model_id.lower():
            body_dict["max_tokens"] = max_tokens
        elif "titan" in model_id.lower() or "amazon" in model_id.lower():
            body_dict = {
                "inputText": full_prompt,
                "textGenerationConfig": {
                    "maxTokenCount": max_tokens,
                    "temperature": temperature,
                },
            }
        elif "cohere" in model_id.lower():
            body_dict = {
                "prompt": full_prompt,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        else:
            body_dict["max_tokens"] = max_tokens

        response = await asyncio.to_thread(
            self._client.invoke_model,
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body_dict),
        )

        result = json.loads(response["body"].read())
        text = (
            result.get("generation", "")
            or result.get("completion", "")
            or result.get("results", [{}])[0].get("outputText", "")
            or result.get("generations", [{}])[0].get("text", "")
            or ""
        )
        if not text and isinstance(result, dict):
            text = str(result)
        if text:
            yield text

    async def list_models(self) -> list[dict]:
        """List available models — curated inference profiles + foundation models."""
        # Curated inference profiles (Bedrock requires these for on-demand)
        profiles = [
            {"model_id": "us.anthropic.claude-sonnet-4-6", "model_name": "Claude Sonnet 4.6", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-haiku-4-5-20251001-v1:0", "model_name": "Claude Haiku 4.5", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-sonnet-4-5-20250929-v1:0", "model_name": "Claude Sonnet 4.5", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-opus-4-6-v1", "model_name": "Claude Opus 4.6", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-opus-4-5-20251101-v1:0", "model_name": "Claude Opus 4.5", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-opus-4-1-20250805-v1:0", "model_name": "Claude Opus 4.1", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-3-7-sonnet-20250219-v1:0", "model_name": "Claude 3.7 Sonnet", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-3-5-sonnet-20241022-v2:0", "model_name": "Claude 3.5 Sonnet v2", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0", "model_name": "Claude 3.5 Haiku", "provider": "Anthropic"},
            {"model_id": "us.anthropic.claude-3-haiku-20240307-v1:0", "model_name": "Claude 3 Haiku", "provider": "Anthropic"},
        ]

        # Also try to fetch foundation models for non-Anthropic options
        try:
            response = await asyncio.to_thread(
                self._bedrock_client.list_foundation_models,
                byOutputModality="TEXT",
            )
            for m in response.get("modelSummaries", []):
                mid = m["modelId"]
                # Skip Anthropic (already covered by profiles above)
                if "anthropic" in mid:
                    continue
                profiles.append({
                    "model_id": mid,
                    "model_name": m.get("modelName", mid),
                    "provider": m.get("providerName", "Unknown"),
                })
        except ClientError as exc:
            logger.warning("Could not fetch foundation models: %s", exc)

        return profiles
