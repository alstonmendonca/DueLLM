"""Core debate orchestrator — runs the builder/critic loop."""

import logging
from typing import AsyncGenerator

from backend.config import get_settings
from backend.debate.convergence import check_convergence
from backend.debate.models import DebateEvent, DebateRequest
from backend.providers.registry import get_provider

logger = logging.getLogger(__name__)

BUILDER_SYSTEM_PROMPT = (
    "You are an expert software engineer. Given a coding or architecture "
    "problem, provide a complete, production-quality solution. When you "
    "receive critique, revise your solution to address every valid point. "
    "Show the full revised solution, not just the changes."
)

CRITIC_SYSTEM_PROMPT = (
    "You are a senior code reviewer and software architect. Your job is to "
    "find flaws in the provided solution: bugs, edge cases, performance "
    "issues, security problems, architectural weaknesses, missing error "
    "handling, and violations of best practices.\n\n"
    "Be specific. Point to exact lines or patterns. Suggest concrete fixes.\n\n"
    'If the solution has no major issues remaining, respond with exactly: '
    '"CONVERGED: No major issues remaining." followed by any minor suggestions.'
)


async def run_debate(
    request: DebateRequest,
    cancel_check: callable = lambda: False,
) -> AsyncGenerator[DebateEvent, None]:
    """Run the debate loop, yielding SSE events as an async generator.

    Args:
        request: The debate configuration and prompt.
        cancel_check: Callable returning True if debate should stop.

    Yields:
        DebateEvent objects for each stage of the debate.
    """
    settings = get_settings()
    provider = get_provider("bedrock")

    builder_model = request.builder_model or settings.default_builder_model
    critic_model = request.critic_model or settings.default_critic_model
    max_rounds = request.max_rounds

    builder_messages: list[dict] = []
    critic_messages: list[dict] = []
    last_builder_response = ""

    for round_num in range(1, max_rounds + 1):
        if cancel_check():
            yield DebateEvent(type="stopped", round=round_num)
            return

        # --- Builder turn ---
        yield DebateEvent(type="builder_start", round=round_num)

        builder_user_content = _build_builder_prompt(
            request.prompt, round_num, builder_messages, critic_messages
        )
        current_builder_messages = [
            *builder_messages,
            {"role": "user", "content": builder_user_content},
        ]

        builder_response = ""
        try:
            async for chunk in provider.generate_stream(
                messages=current_builder_messages,
                system_prompt=BUILDER_SYSTEM_PROMPT,
                model_id=builder_model,
                temperature=request.temperature,
            ):
                builder_response += chunk
                yield DebateEvent(
                    type="builder_chunk", round=round_num, content=chunk
                )
        except Exception as exc:
            logger.error("Builder error in round %d: %s", round_num, exc)
            yield DebateEvent(
                type="error", round=round_num, content=str(exc)
            )
            return

        builder_messages = [
            *current_builder_messages,
            {"role": "assistant", "content": builder_response},
        ]
        last_builder_response = builder_response
        yield DebateEvent(type="builder_end", round=round_num)

        if cancel_check():
            yield DebateEvent(type="stopped", round=round_num)
            return

        # --- Critic turn ---
        yield DebateEvent(type="critic_start", round=round_num)

        critic_user_content = _build_critic_prompt(
            request.prompt, builder_response, round_num, critic_messages
        )
        current_critic_messages = [
            *critic_messages,
            {"role": "user", "content": critic_user_content},
        ]

        critic_response = ""
        try:
            async for chunk in provider.generate_stream(
                messages=current_critic_messages,
                system_prompt=CRITIC_SYSTEM_PROMPT,
                model_id=critic_model,
                temperature=request.temperature,
            ):
                critic_response += chunk
                yield DebateEvent(
                    type="critic_chunk", round=round_num, content=chunk
                )
        except Exception as exc:
            logger.error("Critic error in round %d: %s", round_num, exc)
            yield DebateEvent(
                type="error", round=round_num, content=str(exc)
            )
            return

        converged = check_convergence(critic_response)
        critic_messages = [
            *current_critic_messages,
            {"role": "assistant", "content": critic_response},
        ]
        yield DebateEvent(
            type="critic_end", round=round_num, converged=converged
        )

        if converged:
            yield DebateEvent(
                type="converged",
                round=round_num,
                converged=True,
                final_solution=last_builder_response,
            )
            return

    # Max rounds reached without convergence
    yield DebateEvent(
        type="max_rounds_reached",
        round=max_rounds,
        final_solution=last_builder_response,
    )


def _build_builder_prompt(
    original_prompt: str,
    round_num: int,
    builder_history: list[dict],
    critic_history: list[dict],
) -> str:
    """Build the user message for the builder's turn."""
    if round_num == 1:
        return original_prompt

    last_critique = ""
    for msg in reversed(critic_history):
        if msg["role"] == "assistant":
            last_critique = msg["content"]
            break

    return (
        f"Original task: {original_prompt}\n\n"
        f"The critic provided this feedback on your solution:\n\n"
        f"{last_critique}\n\n"
        f"Please revise your solution to address every valid point. "
        f"Show the full revised solution."
    )


def _build_critic_prompt(
    original_prompt: str,
    builder_response: str,
    round_num: int,
    critic_history: list[dict],
) -> str:
    """Build the user message for the critic's turn."""
    base = (
        f"Original task: {original_prompt}\n\n"
        f"Here is the builder's solution (round {round_num}):\n\n"
        f"{builder_response}\n\n"
        f"Please review this solution thoroughly."
    )

    if critic_history:
        base += (
            "\n\nNote: You have provided previous critiques. "
            "Focus on remaining issues and do not repeat resolved points."
        )

    return base
