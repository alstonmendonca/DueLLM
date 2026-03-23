import { DebateEvent, DebateRequest, BedrockModel, Defaults } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TERMINAL_EVENTS = new Set([
  "converged",
  "max_rounds_reached",
  "stopped",
  "error",
]);

export async function startDebate(
  request: DebateRequest
): Promise<{ debate_id: string }> {
  const res = await fetch(`${API_BASE}/api/debate/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to start debate");
  }
  return res.json();
}

export function streamDebate(
  debateId: string,
  onEvent: (event: DebateEvent) => void,
  onError: (error: string) => void
): () => void {
  const source = new EventSource(
    `${API_BASE}/api/debate/${debateId}/stream`
  );

  let finished = false;

  const eventTypes = [
    "builder_start",
    "builder_chunk",
    "builder_end",
    "critic_start",
    "critic_chunk",
    "critic_end",
    "judge_start",
    "judge_chunk",
    "judge_end",
    "converged",
    "max_rounds_reached",
    "stopped",
    "error",
  ];

  for (const type of eventTypes) {
    source.addEventListener(type, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as DebateEvent;
        onEvent(data);

        // Close the stream on terminal events so EventSource
        // doesn't treat the server-side close as an error
        if (TERMINAL_EVENTS.has(data.type)) {
          finished = true;
          source.close();
        }
      } catch {
        onError(`Failed to parse event: ${e.data}`);
      }
    });
  }

  source.onerror = () => {
    // If we already got a terminal event, this is expected — ignore
    if (finished) return;

    source.close();
    onError("Connection lost — check that the backend is running");
  };

  return () => {
    finished = true;
    source.close();
  };
}

export async function stopDebate(debateId: string): Promise<void> {
  await fetch(`${API_BASE}/api/debate/${debateId}/stop`, { method: "POST" });
}

export async function getModels(): Promise<BedrockModel[]> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.models || [];
}

export async function getDefaults(): Promise<Defaults | null> {
  try {
    const res = await fetch(`${API_BASE}/api/defaults`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
