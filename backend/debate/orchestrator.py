"""Core debate orchestrator — runs the builder/critic loop."""

import logging
from typing import AsyncGenerator

from backend.config import get_settings
from backend.debate.convergence import check_convergence
from backend.debate.models import DebateEvent, DebateRequest
from backend.providers.registry import provider_for_model, strip_provider_prefix

logger = logging.getLogger(__name__)

DEFAULT_BUILDER_SYSTEM_PROMPT = (
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

DEFAULT_CRITIC_SYSTEM_PROMPT_TEMPLATE = (
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
    "exactly: \"{keyword}: No major issues remaining.\" followed by any "
    "minor suggestions. Do not say {keyword} unless you genuinely believe "
    "the solution is production-ready."
)

DEFAULT_JUDGE_SYSTEM_PROMPT_TEMPLATE = (
    "You are a neutral judge evaluating a code debate between a Builder and a Critic. "
    "Score the solution on a scale of {scale}. Consider:\n"
    "- Correctness and completeness\n"
    "- Code quality and best practices\n"
    "- How well the Builder addressed the Critic's feedback\n"
    "- Whether the final solution is production-ready\n\n"
    "Provide your score first, then explain your reasoning concisely.\n"
    "Format: \"SCORE: X/{max}\" followed by your analysis."
)


def _build_critic_system_prompt(convergence_keyword: str, custom_prompt: str | None) -> str:
    """Build the critic system prompt, injecting the convergence keyword."""
    if custom_prompt:
        return custom_prompt
    return DEFAULT_CRITIC_SYSTEM_PROMPT_TEMPLATE.format(keyword=convergence_keyword)


def _build_judge_system_prompt(scoring_scale: str, custom_prompt: str | None) -> str:
    """Build the judge system prompt, injecting the scoring scale."""
    if custom_prompt:
        return custom_prompt

    # Determine max value from scale
    max_val = "10"
    if scoring_scale.lower() == "pass/fail":
        max_val = "Pass or Fail"
    elif "-" in scoring_scale:
        parts = scoring_scale.split("-")
        if len(parts) == 2:
            max_val = parts[1]

    return DEFAULT_JUDGE_SYSTEM_PROMPT_TEMPLATE.format(
        scale=scoring_scale,
        max=max_val
    )


def _extract_score(judge_response: str) -> str | None:
    """Extract the score from a judge response by looking for 'SCORE:' prefix."""
    lines = judge_response.split("\n")
    for line in lines:
        if "SCORE:" in line.upper():
            # Extract everything after SCORE: on that line
            score_part = line.split(":", 1)[1].strip() if ":" in line else ""
            return score_part
    return None


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

    builder_model_raw = request.builder_model or settings.default_builder_model
    critic_model_raw = request.critic_model or settings.default_critic_model
    builder_provider = provider_for_model(builder_model_raw)
    critic_provider = provider_for_model(critic_model_raw)
    builder_model = strip_provider_prefix(builder_model_raw)
    critic_model = strip_provider_prefix(critic_model_raw)
    max_rounds = request.max_rounds
    convergence_keyword = request.convergence_keyword
    builder_system_prompt = request.builder_system_prompt or DEFAULT_BUILDER_SYSTEM_PROMPT
    critic_system_prompt = _build_critic_system_prompt(convergence_keyword, request.critic_system_prompt)

    # Judge setup
    judge_mode = request.judge_mode
    judge_model_raw = request.judge_model or settings.default_builder_model
    judge_provider = provider_for_model(judge_model_raw)
    judge_model = strip_provider_prefix(judge_model_raw)
    judge_system_prompt = _build_judge_system_prompt(
        request.judge_scoring_scale,
        request.judge_system_prompt
    )

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
        cancelled = False
        try:
            async for chunk in builder_provider.generate_stream(
                messages=current_builder_messages,
                system_prompt=builder_system_prompt,
                model_id=builder_model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
            ):
                if cancel_check():
                    cancelled = True
                    break
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

        if cancelled:
            yield DebateEvent(type="stopped", round=round_num)
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
        cancelled = False
        try:
            async for chunk in critic_provider.generate_stream(
                messages=current_critic_messages,
                system_prompt=critic_system_prompt,
                model_id=critic_model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
            ):
                if cancel_check():
                    cancelled = True
                    break
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

        if cancelled:
            yield DebateEvent(type="stopped", round=round_num)
            return

        converged = check_convergence(critic_response, convergence_keyword)
        critic_messages = [
            *current_critic_messages,
            {"role": "assistant", "content": critic_response},
        ]
        yield DebateEvent(
            type="critic_end", round=round_num, converged=converged
        )

        # --- Judge turn (per-round mode) ---
        if judge_mode == "per_round":
            if cancel_check():
                yield DebateEvent(type="stopped", round=round_num)
                return

            yield DebateEvent(type="judge_start", round=round_num, mode="per_round")

            judge_prompt = _build_judge_prompt_per_round(
                request.prompt,
                last_builder_response,
                critic_response,
                round_num
            )

            judge_response = ""
            cancelled = False
            try:
                async for chunk in judge_provider.generate_stream(
                    messages=[{"role": "user", "content": judge_prompt}],
                    system_prompt=judge_system_prompt,
                    model_id=judge_model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    top_p=request.top_p,
                ):
                    if cancel_check():
                        cancelled = True
                        break
                    judge_response += chunk
                    yield DebateEvent(
                        type="judge_chunk", round=round_num, content=chunk
                    )
            except Exception as exc:
                logger.error("Judge error in round %d: %s", round_num, exc)
                yield DebateEvent(
                    type="error", round=round_num, content=f"Judge error: {str(exc)}"
                )
                return

            if cancelled:
                yield DebateEvent(type="stopped", round=round_num)
                return

            score = _extract_score(judge_response)
            yield DebateEvent(
                type="judge_end",
                round=round_num,
                score=score,
                mode="per_round"
            )

        if converged:
            yield DebateEvent(
                type="converged",
                round=round_num,
                converged=True,
                final_solution=last_builder_response,
            )

            # --- Judge turn (post-debate mode after convergence) ---
            if judge_mode == "post_debate":
                if cancel_check():
                    return

                yield DebateEvent(type="judge_start", round=round_num, mode="post_debate")

                judge_prompt = _build_judge_prompt_post_debate(
                    request.prompt,
                    builder_messages,
                    critic_messages
                )

                judge_response = ""
                cancelled = False
                try:
                    async for chunk in judge_provider.generate_stream(
                        messages=[{"role": "user", "content": judge_prompt}],
                        system_prompt=judge_system_prompt,
                        model_id=judge_model,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        top_p=request.top_p,
                    ):
                        if cancel_check():
                            cancelled = True
                            break
                        judge_response += chunk
                        yield DebateEvent(
                            type="judge_chunk", round=round_num, content=chunk
                        )
                except Exception as exc:
                    logger.error("Judge error post-debate: %s", exc)
                    yield DebateEvent(
                        type="error", round=round_num, content=f"Judge error: {str(exc)}"
                    )
                    return

                if cancelled:
                    return

                score = _extract_score(judge_response)
                yield DebateEvent(
                    type="judge_end",
                    round=round_num,
                    score=score,
                    mode="post_debate"
                )

            return

    # Max rounds reached without convergence
    yield DebateEvent(
        type="max_rounds_reached",
        round=max_rounds,
        final_solution=last_builder_response,
    )

    # --- Judge turn (post-debate mode) ---
    if judge_mode == "post_debate":
        if cancel_check():
            return

        yield DebateEvent(type="judge_start", round=max_rounds, mode="post_debate")

        judge_prompt = _build_judge_prompt_post_debate(
            request.prompt,
            builder_messages,
            critic_messages
        )

        judge_response = ""
        cancelled = False
        try:
            async for chunk in judge_provider.generate_stream(
                messages=[{"role": "user", "content": judge_prompt}],
                system_prompt=judge_system_prompt,
                model_id=judge_model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                top_p=request.top_p,
            ):
                if cancel_check():
                    cancelled = True
                    break
                judge_response += chunk
                yield DebateEvent(
                    type="judge_chunk", round=max_rounds, content=chunk
                )
        except Exception as exc:
            logger.error("Judge error post-debate: %s", exc)
            yield DebateEvent(
                type="error", round=max_rounds, content=f"Judge error: {str(exc)}"
            )
            return

        if cancelled:
            return

        score = _extract_score(judge_response)
        yield DebateEvent(
            type="judge_end",
            round=max_rounds,
            score=score,
            mode="post_debate"
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


def _build_judge_prompt_per_round(
    original_prompt: str,
    builder_response: str,
    critic_response: str,
    round_num: int,
) -> str:
    """Build the judge prompt for per-round evaluation."""
    return (
        f"Original task: {original_prompt}\n\n"
        f"--- Round {round_num} Builder Solution ---\n"
        f"{builder_response}\n\n"
        f"--- Round {round_num} Critic Feedback ---\n"
        f"{critic_response}\n\n"
        f"Evaluate the Builder's solution and the Critic's feedback for this round."
    )


def _build_judge_prompt_post_debate(
    original_prompt: str,
    builder_messages: list[dict],
    critic_messages: list[dict],
) -> str:
    """Build the judge prompt for post-debate evaluation."""
    transcript_parts = [f"Original task: {original_prompt}\n"]

    # Interleave builder and critic messages by round
    max_messages = max(len(builder_messages), len(critic_messages))
    round_num = 1

    for i in range(0, max_messages, 2):
        if i < len(builder_messages) and builder_messages[i]["role"] == "assistant":
            transcript_parts.append(
                f"\n--- Round {round_num} Builder Solution ---\n"
                f"{builder_messages[i]['content']}\n"
            )

        if i + 1 < len(critic_messages) and critic_messages[i + 1]["role"] == "assistant":
            transcript_parts.append(
                f"\n--- Round {round_num} Critic Feedback ---\n"
                f"{critic_messages[i + 1]['content']}\n"
            )

        round_num += 1

    transcript_parts.append(
        "\n\nEvaluate the final solution based on the complete debate transcript above."
    )

    return "".join(transcript_parts)
