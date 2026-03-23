# DueLLM New Features Design Spec

**Date:** 2026-03-23
**Status:** Approved

## Overview

Four new features for DueLLM, all highly configurable. Every feature is opt-in and user-controlled through the existing tabbed settings dialog.

---

## 1. Debate History

### What
Auto-save completed debates to localStorage. Browse, search, replay, and delete past debates.

### User-Configurable Options (Settings > Debate tab)
- **Auto-save debates**: Toggle ON/OFF (default: ON)
- **Max saved debates**: Slider 10-100 (default: 50, oldest auto-pruned)
- **Save incomplete debates**: Toggle — save debates that were stopped early (default: OFF)

### Architecture
- `lib/history.ts` — storage interface abstraction (get, save, delete, search, clear)
- `lib/history-local.ts` — localStorage implementation behind the interface
- `components/history-sidebar.tsx` — slide-out sidebar listing past debates
- Each saved debate stores: `{ id, prompt, builderRounds, criticRounds, judgeRounds?, finalSolution, settings, status, timestamp }`
- History button in the header opens the sidebar
- Click a debate to load it in read-only replay mode
- Delete individual debates or "clear all" with confirmation

### Future-Proofing
The storage interface makes it trivial to swap in a backend implementation later (file-based, SQLite, etc.) without changing any UI code.

---

## 2. Syntax Highlighting

### What
Proper syntax-highlighted code blocks in all panels using Shiki (VS Code's highlighter).

### User-Configurable Options (Settings > Appearance tab)
- **Syntax highlighting**: Toggle ON/OFF (default: ON)
- **Highlight theme**: Dropdown — github-dark, github-light, one-dark-pro, dracula, nord, min-light, min-dark (default: follows current DueLLM theme — dark themes get github-dark, light themes get github-light)
- **Show line numbers in code**: Toggle ON/OFF (default: OFF)

### Architecture
- `components/code-block.tsx` — new component wrapping Shiki's `codeToHtml`
- Replaces the `<pre><code>` rendering inside `streaming-text.tsx`'s `formatContent`
- Language auto-detected from ` ```lang ` fence marker
- Falls back to plain monospace if language not recognized or highlighting is OFF
- Shiki loaded lazily (dynamic import) to avoid blocking initial page load
- During streaming, code blocks render plain until the closing ` ``` ` is received, then highlight

### Dependencies
- `shiki` npm package

---

## 3. Judge Mode

### What
Optional 3rd LLM that evaluates the debate. Two modes: post-debate summary or live per-round scoring.

### User-Configurable Options (Settings > Models tab, new "Judge" section)
- **Judge mode**: OFF / Post-debate / Per-round (default: OFF)
- **Judge provider**: Bedrock / Ollama (follows "same provider" toggle, or independent)
- **Judge model**: Model dropdown filtered by selected provider
- **Judge system prompt**: Textarea in Prompts tab (default provided, customizable)
- **Judge scoring scale**: 1-5 / 1-10 / Pass/Fail (default: 1-10)

### Backend Changes

#### New SSE events
- `judge_start` — Judge begins evaluating
- `judge_chunk` — Streaming token from Judge
- `judge_end` — Judge finished, includes `score` and `mode` fields

#### DebateRequest additions
- `judge_model: Optional[str]`
- `judge_mode: "off" | "post_debate" | "per_round"`
- `judge_system_prompt: Optional[str]`
- `judge_scoring_scale: str` (default: "1-10")

#### Orchestrator changes
- After each `critic_end` (per-round mode): run judge turn with Builder output + Critic critique
- After final solution (post-debate mode): run judge turn with full debate transcript
- Judge system prompt instructs it to score on the configured scale and explain its reasoning

### Frontend Changes

#### Judge Panel
- **Per-round mode**: Thin collapsible panel between Builder and Critic (or below in stacked layout). Shows score badge + expandable commentary per round.
- **Post-debate mode**: Collapsible section between the debate panels and the Final Solution. Shows overall score + detailed commentary.
- Panel is hidden entirely when judge mode is OFF.

#### Default Judge System Prompt
```
You are a neutral judge evaluating a code debate between a Builder and a Critic.
Score the solution on a scale of {scale}. Consider:
- Correctness and completeness
- Code quality and best practices
- How well the Builder addressed the Critic's feedback
- Whether the final solution is production-ready

Provide your score first, then explain your reasoning concisely.
Format: "SCORE: X/{max}" followed by your analysis.
```

---

## 4. Round Diffs

### What
Show what changed between Builder rounds as a unified diff view.

### User-Configurable Options (Settings > Debate tab)
- **Show diff buttons**: Toggle ON/OFF (default: ON)
- **Diff style**: Unified / Split (default: unified)
- **Diff context lines**: Slider 1-10 (default: 3)

### Architecture
- `lib/diff.ts` — thin wrapper around a diff algorithm. Uses `diff` npm package (battle-tested, tiny).
- `components/round-diff.tsx` — renders the diff output with green/red line coloring
- Each Builder round header (round 2+) gets a "diff" toggle button
- When toggled, replaces the round content with a diff view comparing current round vs previous round
- Toggle back to see the full content again
- Available in both live debates and history replay
- In split diff mode, shows old on left and new on right side-by-side

### Dependencies
- `diff` npm package

---

## Settings Summary

All new settings with their locations:

| Tab | Setting | Type | Default |
|-----|---------|------|---------|
| Models | Judge mode | OFF/Post-debate/Per-round | OFF |
| Models | Judge provider | Bedrock/Ollama | follows builder |
| Models | Judge model | Dropdown | — |
| Models | Judge scoring scale | 1-5/1-10/Pass-Fail | 1-10 |
| Prompts | Judge system prompt | Textarea | (default provided) |
| Debate | Auto-save debates | Toggle | ON |
| Debate | Max saved debates | Slider 10-100 | 50 |
| Debate | Save incomplete | Toggle | OFF |
| Debate | Show diff buttons | Toggle | ON |
| Debate | Diff style | Unified/Split | Unified |
| Debate | Diff context lines | Slider 1-10 | 3 |
| Appearance | Syntax highlighting | Toggle | ON |
| Appearance | Highlight theme | Dropdown (7 themes) | auto |
| Appearance | Line numbers in code | Toggle | OFF |

---

## Build Order

1. **Syntax highlighting** — smallest scope, immediate visual impact, no backend changes
2. **Round diffs** — frontend only, uses new dependency, builds on existing round data
3. **Debate history** — frontend + storage abstraction, touches page.tsx for auto-save
4. **Judge mode** — backend + frontend, new SSE events, new panel, most complex

Each feature is independent and can be shipped incrementally.
