"""FastAPI application for DueLLM — the LLM debate platform."""

import asyncio
import json
import logging
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from backend.debate.models import (
    DebateEvent,
    DebateMessage,
    DebateRequest,
    DebateState,
    DebateStatus,
)
from backend.debate.orchestrator import run_debate
from backend.providers.bedrock import BedrockProvider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DueLLM", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory debate store
_debates: dict[str, DebateState] = {}
_requests: dict[str, DebateRequest] = {}
_cancel_flags: dict[str, bool] = {}
_debate_locks: dict[str, asyncio.Lock] = {}


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "duellm"}


@app.get("/api/models")
async def list_models() -> dict:
    """List available Bedrock models."""
    try:
        provider = BedrockProvider()
        models = await provider.list_models()
        return {"models": models}
    except Exception as exc:
        logger.error("Failed to list models: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/debate/start")
async def start_debate(request: DebateRequest) -> dict:
    """Start a new debate and return the debate ID."""
    debate_id = str(uuid.uuid4())
    state = DebateState(id=debate_id, prompt=request.prompt)

    _debates[debate_id] = state
    _requests[debate_id] = request
    _cancel_flags[debate_id] = False
    _debate_locks[debate_id] = asyncio.Lock()

    return {"debate_id": debate_id, "status": "pending"}


@app.get("/api/debate/{debate_id}/stream")
async def stream_debate(debate_id: str) -> EventSourceResponse:
    """Stream debate events via SSE."""
    if debate_id not in _debates:
        raise HTTPException(status_code=404, detail="Debate not found")

    state = _debates[debate_id]
    if state.status not in (DebateStatus.PENDING, DebateStatus.RUNNING):
        raise HTTPException(
            status_code=400,
            detail=f"Debate is already {state.status.value}",
        )

    if debate_id not in _requests:
        raise HTTPException(status_code=400, detail="Debate request not found")

    request = _requests[debate_id]

    async def event_generator():
        _debates[debate_id] = _debates[debate_id].with_status(
            DebateStatus.RUNNING
        )

        current_round = 0
        current_role = ""
        accumulated_content = ""

        try:
            async for event in run_debate(
                request=request,
                cancel_check=lambda: _cancel_flags.get(debate_id, False),
            ):
                # Track round and accumulate content for state updates
                if event.type == "builder_start":
                    current_round = event.round or 0
                    current_role = "builder"
                    accumulated_content = ""
                elif event.type == "critic_start":
                    current_role = "critic"
                    accumulated_content = ""
                elif event.type in ("builder_chunk", "critic_chunk"):
                    accumulated_content += event.content or ""
                elif event.type in ("builder_end", "critic_end"):
                    msg = DebateMessage(
                        role=current_role,
                        round=current_round,
                        content=accumulated_content,
                    )
                    _debates[debate_id] = (
                        _debates[debate_id]
                        .with_message(msg)
                        .with_rounds(current_round)
                    )
                elif event.type == "converged":
                    _debates[debate_id] = _debates[
                        debate_id
                    ].with_final_solution(event.final_solution or "")
                elif event.type == "max_rounds_reached":
                    _debates[debate_id] = (
                        _debates[debate_id]
                        .with_status(DebateStatus.STOPPED)
                    )
                    if event.final_solution:
                        _debates[debate_id] = _debates[
                            debate_id
                        ].model_copy(
                            update={"final_solution": event.final_solution}
                        )
                elif event.type == "error":
                    _debates[debate_id] = _debates[
                        debate_id
                    ].with_status(DebateStatus.ERROR)
                elif event.type == "stopped":
                    _debates[debate_id] = _debates[
                        debate_id
                    ].with_status(DebateStatus.STOPPED)

                yield {
                    "event": event.type,
                    "data": json.dumps(event.model_dump(exclude_none=True)),
                }

        except Exception as exc:
            logger.error("Debate stream error: %s", exc)
            _debates[debate_id] = _debates[debate_id].with_status(
                DebateStatus.ERROR
            )
            error_event = DebateEvent(type="error", content=str(exc))
            yield {
                "event": "error",
                "data": json.dumps(
                    error_event.model_dump(exclude_none=True)
                ),
            }

    return EventSourceResponse(event_generator())


@app.post("/api/debate/{debate_id}/stop")
async def stop_debate(debate_id: str) -> dict:
    """Stop a running debate early."""
    if debate_id not in _debates:
        raise HTTPException(status_code=404, detail="Debate not found")

    _cancel_flags[debate_id] = True
    state = _debates[debate_id]

    if state.status == DebateStatus.RUNNING:
        _debates[debate_id] = state.with_status(DebateStatus.STOPPED)

    return {"debate_id": debate_id, "status": _debates[debate_id].status.value}


@app.get("/api/debate/{debate_id}")
async def get_debate(debate_id: str) -> dict:
    """Get the full state of a debate."""
    if debate_id not in _debates:
        raise HTTPException(status_code=404, detail="Debate not found")

    return _debates[debate_id].model_dump()
