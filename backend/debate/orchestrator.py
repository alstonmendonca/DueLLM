"""Core debate orchestrator — runs the builder/critic loop."""

import logging
from typing import AsyncGenerator

from backend.config import get_settings
from backend.debate.convergence import check_convergence
from backend.debate.models import DebateEvent, DebateRequest
from backend.providers.registry import get_provider

logger = logging.getLogger(__name__)

BUILDER_SYSTEM_PROMPT = (
    "You are an expert software engineer participating in DueLLM — an "
    "adversarial debate system where two LLMs collaborate to produce the "
    "best possible solution. You are the BUILDER.\n\n"
    "How this works:\n"
    "- You generate a solution to the user's coding or architecture problem.\n"
    "- Another LLM (the Critic) will review your output and find flaws.\n"
    "- You will then receive the Critic's analysis and must revise your "
    "solution to address every valid point.\n"
    "- This loop repeats until the Critic finds no major issues.\n\n"
    "Your goal is to produce a complete, production-quality solution. "
    "When revising, show the full revised solution — not just the changes. "
    "Take the Critic's feedback seriously: it is another LLM whose sole "
    "purpose is to stress-test your work. Disagreeing is fine if you can "
    "justify your reasoning, but do not be defensive — improve the code."
)

CRITIC_SYSTEM_PROMPT = (
    "You are a senior code reviewer and software architect participating in "
    "DueLLM — an adversarial debate system where two LLMs collaborate to "
    "produce the best possible solution. You are the CRITIC.\n\n"
    "How this works:\n"
    "- Another LLM (the Builder) has generated a solution to a coding or "
    "architecture problem.\n"
    "- Your job is to thoroughly review the Builder's output and find every "
    "flaw: bugs, edge cases, performance issues, security problems, "
    "architectural weaknesses, missing error handling, and violations of "
    "best practices.\n"
    "- The Builder will revise based on your critique, and you will review "
    "again. This loop continues until you are satisfied.\n\n"
    "Be specific. Point to exact lines or patterns. Suggest concrete fixes. "
    "Remember: you are reviewing another LLM's output, not a human's — "
    "LLMs tend to produce plausible-looking code that misses edge cases, "
    "has subtle concurrency bugs, or uses outdated patterns. Look harder "
    "than you would for human code.\n\n"
    "When the solution has no major issues remaining, you MUST respond with "
    "exactly: \"CONVERGED: No major issues remaining.\" followed by any "
    "minor suggestions. Do not say CONVERGED unless you genuinely believe "
    "the solution is production-ready."
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
        f"The Critic LLM reviewed your round {round_num - 1} solution and "
        f"provided this analysis:\n\n"
        f"{last_critique}\n\n"
        f"Revise your solution to address every valid point. If you disagree "
        f"with a critique, explain why. Show the full revised solution."
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
        f"The Builder LLM produced this solution (round {round_num}):\n\n"
        f"{builder_response}\n\n"
        f"Review this LLM-generated solution thoroughly. Remember that LLM "
        f"code often looks correct at first glance but has subtle issues."
    )

    if critic_history:
        base += (
            f"\n\nYou previously critiqued round {round_num - 1}. "
            f"The Builder has attempted to address your feedback. "
            f"Focus on: (1) whether your previous issues were actually fixed, "
            f"(2) any new issues introduced by the revision, "
            f"(3) remaining problems you haven't flagged yet."
        )

    return base
