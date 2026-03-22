# DueLLM — Design Spec

**Date:** 2026-03-22
**Status:** Approved

## Overview

DueLLM is a web app where two LLMs debate to produce better code and architecture solutions. LLM A (the Builder) generates a solution. LLM B (the Critic) finds flaws. A revises. The loop continues until the Critic has no major issues or the max round limit is reached.

The result: code and architecture decisions that have been stress-tested through adversarial critique before a human ever sees them.

## How It Works

```
User enters prompt (e.g., "Design a rate limiter in Python")
        │
        ▼
   ┌─────────┐
   │ Round 1  │
   ├─────────┤
   │ Builder  │──► Generates initial solution
   │ (LLM A)  │
   └────┬─────┘
        │
        ▼
   ┌─────────┐
   │ Critic   │──► Critiques: bugs, edge cases, architecture flaws
   │ (LLM B)  │
   └────┬─────┘
        │
        ▼
   ┌─────────┐
   │ Round 2  │
   ├─────────┤
   │ Builder  │──► Revises based on critique
   │ (LLM A)  │
   └────┬─────┘
        │
        ▼
   ┌─────────┐
   │ Critic   │──► Re-critiques. Issues remaining? Continue or converge.
   │ (LLM B)  │
   └────┬─────┘
        │
        ▼
   Converged? ──► Yes ──► Final Solution presented
        │
        No ──► Next round (up to max)
```

## Architecture

```
┌──────────────────────────────────────────────┐
│              Next.js Frontend                 │
│         (TypeScript, shadcn/ui, B&W)         │
│                                               │
│  ┌─────────────┐  ┌─────────────┐            │
│  │ Builder      │  │ Critic      │            │
│  │ Panel (Left) │  │ Panel (Right)│           │
│  │              │  │              │            │
│  │ Streaming    │  │ Streaming    │            │
│  │ responses    │  │ responses    │            │
│  └─────────────┘  └─────────────┘            │
│                                               │
│  ┌───────────────────────────────┐            │
│  │ Final Merged Solution         │            │
│  └───────────────────────────────┘            │
│                                               │
│  Settings: max rounds, model selection,       │
│  temperature, system prompts                  │
└──────────────────┬───────────────────────────┘
                   │ REST + SSE (streaming)
                   ▼
┌──────────────────────────────────────────────┐
│            Python FastAPI Backend              │
│                                               │
│  ┌────────────────┐  ┌────────────────┐      │
│  │ Debate          │  │ Bedrock        │      │
│  │ Orchestrator    │  │ Client         │      │
│  │                 │  │ (boto3)        │      │
│  │ - Round mgmt    │  │                │      │
│  │ - Convergence   │  │ - invoke_model │      │
│  │   detection     │  │ - streaming    │      │
│  │ - History mgmt  │  │ - retry logic  │      │
│  └────────────────┘  └────────────────┘      │
│                                               │
│  ┌────────────────┐  ┌────────────────┐      │
│  │ Provider        │  │ Session        │      │
│  │ Registry        │  │ Store          │      │
│  │                 │  │                │      │
│  │ - Bedrock       │  │ - In-memory    │      │
│  │ - (future:      │  │ - Debate       │      │
│  │   OpenAI,       │  │   history      │      │
│  │   Anthropic,    │  │ - Export       │      │
│  │   Ollama)       │  │                │      │
│  └────────────────┘  └────────────────┘      │
└──────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript**
- **shadcn/ui** — component library
- **Tailwind CSS** — black and white minimalist theme
- **Server-Sent Events** — for streaming LLM responses in real-time

### Backend
- **Python 3.11+**
- **FastAPI** — REST API + SSE endpoints
- **boto3** — AWS Bedrock SDK
- **Pydantic** — request/response validation

### LLM Provider (v1)
- **Amazon Bedrock** — Claude, Llama, Mistral models via Bedrock API
- User configures AWS credentials (access key + secret or AWS profile)
- Future: OpenAI, Anthropic direct, Ollama, Google Gemini

## UI Design

### Layout: Split Screen

```
┌─────────────────────────────────────────────────┐
│  DueLLM                        [Settings] [New] │
├────────────────────┬────────────────────────────┤
│                    │                            │
│  BUILDER (LLM A)   │  CRITIC (LLM B)           │
│                    │                            │
│  Round 1:          │                            │
│  Here's a rate     │  Round 1 Critique:         │
│  limiter using     │  1. No thread safety       │
│  a dict...         │  2. Memory leak — no TTL   │
│  ```python         │  3. O(n) cleanup           │
│  class RateLimit:  │                            │
│  ...               │  Suggest: sliding window   │
│  ```               │  with deque + lock         │
│                    │                            │
│  Round 2:          │  Round 2 Critique:         │
│  Revised with      │  Much better. Minor:       │
│  threading.Lock    │  1. Add __repr__ for       │
│  and deque...      │     debugging              │
│  ```python         │  2. Consider dataclass     │
│  ...               │                            │
│  ```               │  Verdict: CONVERGED ✓      │
│                    │                            │
├────────────────────┴────────────────────────────┤
│  FINAL SOLUTION                                  │
│  ```python                                       │
│  @dataclass                                      │
│  class RateLimiter:                              │
│      ...                                         │
│  ```                                             │
│  [Copy] [Export] [New Debate]                    │
└─────────────────────────────────────────────────┘
```

### Design System
- **Colors:** Black background (#000 or #0a0a0a), white text, gray borders. No color except for status indicators (green for converged, yellow for in-progress, red for issues).
- **Typography:** Monospace for code, Inter/system font for UI text
- **Components:** shadcn/ui cards, buttons, dialogs, selects, badges
- **Code blocks:** Syntax-highlighted with a dark theme (e.g., One Dark or similar)
- **Streaming:** Text appears character-by-character as the LLM responds

### Pages

1. **Main page (`/`)** — The debate interface. Prompt input at top, split panels below, final solution at bottom.
2. **Settings (`/settings` or modal)** — AWS credentials, model selection for Builder and Critic, max rounds, temperature, custom system prompts.
3. **History (`/history`)** — Past debates. Click to view. Stored in localStorage or optional backend persistence.

## API Design

### Endpoints

```
POST /api/debate/start
  Body: { prompt, builder_model, critic_model, max_rounds, temperature }
  Returns: { debate_id }
  Starts the debate loop. Results streamed via SSE.

GET  /api/debate/{debate_id}/stream
  SSE stream of debate events:
    { type: "builder_start", round: 1 }
    { type: "builder_chunk", content: "..." }
    { type: "builder_end", round: 1 }
    { type: "critic_start", round: 1 }
    { type: "critic_chunk", content: "..." }
    { type: "critic_end", round: 1, converged: false }
    { type: "builder_start", round: 2 }
    ...
    { type: "converged", final_solution: "..." }

POST /api/debate/{debate_id}/stop
  Stops the debate early. Returns current state.

GET  /api/debate/{debate_id}
  Returns full debate history (all rounds, all messages).

GET  /api/models
  Returns available Bedrock models.

POST /api/settings
  Save AWS credentials and preferences.

GET  /api/health
  Health check.
```

### SSE Event Types

| Event | Description |
|-------|-------------|
| `builder_start` | Builder begins generating for round N |
| `builder_chunk` | Streaming token from Builder |
| `builder_end` | Builder finished for round N |
| `critic_start` | Critic begins critiquing round N |
| `critic_chunk` | Streaming token from Critic |
| `critic_end` | Critic finished. Includes `converged: bool` |
| `converged` | Debate ended. Includes `final_solution` |
| `error` | Something went wrong |

## Debate Orchestration Logic

### System Prompts

**Builder (LLM A):**
```
You are an expert software engineer. Given a coding or architecture problem,
provide a complete, production-quality solution. When you receive critique,
revise your solution to address every valid point. Show the full revised
solution, not just the changes.
```

**Critic (LLM B):**
```
You are a senior code reviewer and software architect. Your job is to find
flaws in the provided solution: bugs, edge cases, performance issues,
security problems, architectural weaknesses, missing error handling, and
violations of best practices.

Be specific. Point to exact lines or patterns. Suggest concrete fixes.

If the solution has no major issues remaining, respond with exactly:
"CONVERGED: No major issues remaining." followed by any minor suggestions.
```

### Convergence Detection

The Critic's response is checked for the "CONVERGED" keyword. If found:
- Extract any minor suggestions
- Run one final Builder pass to apply minor suggestions (optional)
- Present the final solution

### Round Management

- Default max rounds: 5
- User-configurable: 1–10
- Auto-stop on convergence
- User can click "Stop" at any time to use the current best version

### Context Management

Each round, the Builder receives:
- Original prompt
- Its previous solution
- The Critic's latest critique

Each round, the Critic receives:
- Original prompt
- The Builder's latest solution
- Previous critique history (so it doesn't repeat itself)

## Bedrock Integration

### Supported Models (v1)

| Model | Role | Notes |
|-------|------|-------|
| Claude 3.5 Sonnet | Builder or Critic | Best for code |
| Claude 3 Haiku | Critic | Fast, cheap, good for critique |
| Llama 3 70B | Builder or Critic | Open-source alternative |
| Mistral Large | Builder or Critic | Good code generation |

User picks which model plays Builder and which plays Critic. Can use the same model for both (it gets different system prompts).

### Streaming

Use Bedrock's `invoke_model_with_response_stream` for real-time token streaming. Forward chunks to the frontend via SSE.

### Error Handling

- Retry with exponential backoff on throttling (429)
- Surface model errors to the user
- Fallback: if streaming fails, fall back to non-streaming invoke

## Project Structure

```
DueLLM/
├── frontend/                 # Next.js app
│   ├── app/
│   │   ├── page.tsx         # Main debate interface
│   │   ├── layout.tsx       # Root layout
│   │   ├── history/
│   │   │   └── page.tsx     # Past debates
│   │   └── globals.css      # Tailwind + custom styles
│   ├── components/
│   │   ├── debate-panel.tsx  # Split-screen debate view
│   │   ├── builder-panel.tsx # Left panel (Builder)
│   │   ├── critic-panel.tsx  # Right panel (Critic)
│   │   ├── final-solution.tsx# Bottom merged solution
│   │   ├── prompt-input.tsx  # Top prompt input bar
│   │   ├── round-badge.tsx   # Round indicator
│   │   ├── settings-dialog.tsx
│   │   ├── code-block.tsx    # Syntax-highlighted code
│   │   └── streaming-text.tsx# Character-by-character text
│   ├── lib/
│   │   ├── api.ts           # Backend API client
│   │   ├── sse.ts           # SSE event handling
│   │   └── types.ts         # TypeScript types
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                  # Python FastAPI
│   ├── main.py              # FastAPI app, routes
│   ├── debate/
│   │   ├── orchestrator.py  # Debate loop logic
│   │   ├── models.py        # Pydantic models
│   │   └── convergence.py   # Convergence detection
│   ├── providers/
│   │   ├── base.py          # Abstract LLM provider
│   │   ├── bedrock.py       # AWS Bedrock implementation
│   │   └── registry.py      # Provider registry
│   ├── config.py            # Settings, env vars
│   ├── requirements.txt
│   └── .env.example
│
├── DESIGN.md                 # This file
├── README.md
├── .gitignore
└── docker-compose.yml        # Optional: run both services
```

## Build Order

1. **Backend: Bedrock client** — Connect to Bedrock, invoke model, stream response
2. **Backend: Debate orchestrator** — Round loop, context management, convergence detection
3. **Backend: SSE endpoint** — Stream debate events to frontend
4. **Frontend: Prompt input** — Text area + start button
5. **Frontend: Split panels** — Builder and Critic panels with streaming text
6. **Frontend: Final solution** — Merged output with copy/export
7. **Frontend: Settings** — AWS credentials, model selection, round config
8. **Frontend: History** — localStorage-based debate history
9. **Polish: Code syntax highlighting, loading states, error handling**
10. **Deploy: Docker compose for local dev, optional Vercel + Railway**
