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
    ) -> AsyncGenerator[str, None]:
        """Stream text chunks from a Bedrock model."""
        for attempt in range(MAX_RETRIES):
            try:
                if _is_claude_model(model_id):
                    async for chunk in self._stream_claude(
                        messages, system_prompt, model_id, temperature
                    ):
                        yield chunk
                else:
                    async for chunk in self._stream_converse(
                        messages, system_prompt, model_id, temperature
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
    ) -> AsyncGenerator[str, None]:
        """Stream using the Claude Messages API format."""
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "temperature": temperature,
            "system": system_prompt,
            "messages": messages,
        })

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

    async def _stream_converse(
        self,
        messages: list[dict],
        system_prompt: str,
        model_id: str,
        temperature: float,
    ) -> AsyncGenerator[str, None]:
        """Stream using the Bedrock Converse API (Llama, Mistral, etc.)."""
        converse_messages = [
            {
                "role": msg["role"],
                "content": [{"text": msg["content"]}],
            }
            for msg in messages
        ]

        response = await asyncio.to_thread(
            self._client.converse_stream,
            modelId=model_id,
            messages=converse_messages,
            system=[{"text": system_prompt}],
            inferenceConfig={
                "maxTokens": 4096,
                "temperature": temperature,
            },
        )

        for event in response["stream"]:
            if "contentBlockDelta" in event:
                text = event["contentBlockDelta"].get("delta", {}).get("text", "")
                if text:
                    yield text

    async def list_models(self) -> list[dict]:
        """List available foundation models from Bedrock."""
        try:
            response = await asyncio.to_thread(
                self._bedrock_client.list_foundation_models,
                byOutputModality="TEXT",
            )
            return [
                {
                    "model_id": m["modelId"],
                    "model_name": m.get("modelName", m["modelId"]),
                    "provider": m.get("providerName", "Unknown"),
                }
                for m in response.get("modelSummaries", [])
            ]
        except ClientError as exc:
            logger.error("Failed to list Bedrock models: %s", exc)
            return []
