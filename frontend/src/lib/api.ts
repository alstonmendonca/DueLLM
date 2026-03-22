import { DebateEvent, DebateRequest, BedrockModel } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const eventTypes = [
    "builder_start",
    "builder_chunk",
    "builder_end",
    "critic_start",
    "critic_chunk",
    "critic_end",
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
      } catch {
        onError(`Failed to parse event: ${e.data}`);
      }
    });
  }

  source.onerror = () => {
    onError("Connection lost");
    source.close();
  };

  return () => source.close();
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
