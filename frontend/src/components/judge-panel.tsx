"use client";

import StreamingText from "./streaming-text";

interface JudgeRound {
  round: number;
  content: string;
  score?: string;
}

interface JudgePanelProps {
  rounds: JudgeRound[];
  isStreaming: boolean;
  currentStreamContent: string;
  currentRound: number;
  mode: "per_round" | "post_debate";
  modelName?: string;
  autoScroll?: boolean;
  syntaxHighlighting?: boolean;
  highlightTheme?: string;
}

export default function JudgePanel({
  rounds,
  isStreaming,
  currentStreamContent,
  currentRound,
  mode,
  modelName,
  autoScroll = true,
  syntaxHighlighting = true,
  highlightTheme = "auto",
}: JudgePanelProps) {
  const hasContent = rounds.length > 0 || isStreaming;

  if (!hasContent && !isStreaming) return null;

  return (
    <div style={{ borderTop: "1px solid rgba(128,128,128,0.15)" }}>
      <div className="flex items-center gap-3 px-4 py-2.5"
           style={{ borderBottom: "1px solid rgba(128,128,128,0.1)" }}>
        <div className="flex h-5 w-5 items-center justify-center rounded"
             style={{ border: "1px solid rgba(128,128,128,0.2)" }}>
          <span className="font-mono text-[10px] font-bold" style={{ color: "var(--duo-fg)", opacity: 0.5 }}>J</span>
        </div>
        <span className="text-xs font-medium tracking-wide" style={{ color: "var(--duo-fg)", opacity: 0.55 }}>Judge</span>
        {modelName && (
          <span className="font-mono text-[9px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>
            {modelName.split(".").pop()?.split("-").slice(0, 3).join("-")}
          </span>
        )}
        <span className="rounded px-1.5 py-0.5 font-mono text-[9px]" style={{ border: "1px solid rgba(128,128,128,0.2)", color: "var(--duo-fg)", opacity: 0.4 }}>
          {mode === "per_round" ? "per-round" : "post-debate"}
        </span>
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 animate-pulse rounded-full" style={{ background: "var(--duo-fg)" }} />
            <span className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>judging</span>
          </div>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto">
        {rounds.map((r) => (
          <div key={r.round}>
            <div className="flex items-center gap-2 px-4 py-1.5" style={{ borderBottom: "1px solid rgba(128,128,128,0.06)" }}>
              <span className="font-mono text-[10px] font-medium" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>
                {mode === "post_debate" ? "final verdict" : `round ${r.round}`}
              </span>
              {r.score && (
                <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ backgroundColor: "var(--duo-fg)", color: "var(--duo-bg)", opacity: 0.8 }}>
                  {r.score}
                </span>
              )}
            </div>
            <StreamingText content={r.content} isStreaming={false} autoScroll={autoScroll} syntaxHighlighting={syntaxHighlighting} highlightTheme={highlightTheme} />
          </div>
        ))}
        {isStreaming && (
          <div>
            <div className="px-4 py-1.5" style={{ borderBottom: "1px solid rgba(128,128,128,0.06)" }}>
              <span className="font-mono text-[10px] font-medium" style={{ color: "var(--duo-fg)", opacity: 0.5 }}>
                {mode === "post_debate" ? "final verdict" : `round ${currentRound}`}
              </span>
            </div>
            <StreamingText content={currentStreamContent} isStreaming={true} autoScroll={autoScroll} syntaxHighlighting={syntaxHighlighting} highlightTheme={highlightTheme} />
          </div>
        )}
      </div>
    </div>
  );
}
