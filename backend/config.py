"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings for the DueLLM backend, loaded from .env file."""

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    default_builder_model: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    default_critic_model: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    max_rounds: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


def get_settings() -> Settings:
    """Return a fresh Settings instance (reads env on each call)."""
    return Settings()
