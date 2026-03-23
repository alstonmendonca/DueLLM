"""Pydantic models for the debate system."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DebateStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    CONVERGED = "converged"
    STOPPED = "stopped"
    ERROR = "error"


class DebateRequest(BaseModel):
    """Request to start a new debate."""

    prompt: str = Field(..., min_length=1, max_length=10000)
    builder_model: Optional[str] = None
    critic_model: Optional[str] = None
    max_rounds: int = Field(default=5, ge=1, le=10)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=4096, ge=512, le=16384)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    builder_system_prompt: Optional[str] = None
    critic_system_prompt: Optional[str] = None
    convergence_keyword: str = Field(default="CONVERGED")
    judge_model: Optional[str] = None
    judge_mode: str = Field(default="off")  # "off", "post_debate", "per_round"
    judge_system_prompt: Optional[str] = None
    judge_scoring_scale: str = Field(default="1-10")


class DebateEvent(BaseModel):
    """A single SSE event emitted during a debate."""

    type: str
    round: Optional[int] = None
    content: Optional[str] = None
    converged: Optional[bool] = None
    final_solution: Optional[str] = None
    score: Optional[str] = None
    mode: Optional[str] = None


class DebateMessage(BaseModel):
    """A single message in the debate history."""

    role: str = Field(..., pattern=r"^(builder|critic)$")
    round: int
    content: str


class DebateState(BaseModel):
    """Full state of a debate session."""

    id: str
    prompt: str
    rounds: int = 0
    messages: list[DebateMessage] = Field(default_factory=list)
    status: DebateStatus = DebateStatus.PENDING
    final_solution: Optional[str] = None

    def with_message(self, message: DebateMessage) -> "DebateState":
        """Return a new DebateState with the message appended."""
        return self.model_copy(
            update={"messages": [*self.messages, message]}
        )

    def with_status(self, status: DebateStatus) -> "DebateState":
        """Return a new DebateState with an updated status."""
        return self.model_copy(update={"status": status})

    def with_rounds(self, rounds: int) -> "DebateState":
        """Return a new DebateState with updated round count."""
        return self.model_copy(update={"rounds": rounds})

    def with_final_solution(self, solution: str) -> "DebateState":
        """Return a new DebateState with the final solution set."""
        return self.model_copy(
            update={
                "final_solution": solution,
                "status": DebateStatus.CONVERGED,
            }
        )
