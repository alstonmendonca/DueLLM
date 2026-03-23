"use client";

import StreamingText from "./streaming-text";

interface CriticPanelProps {
  rounds: { round: number; content: string; converged: boolean }[];
  isStreaming: boolean;
  currentStreamContent: string;
  currentRound: number;
  modelName?: string;
  autoScroll?: boolean;
  syntaxHighlighting?: boolean;
  highlightTheme?: string;
  showLineNumbers?: boolean;
}

export default function CriticPanel({
  rounds,
  isStreaming,
  currentStreamContent,
  currentRound,
  modelName,
  autoScroll = true,
  syntaxHighlighting = true,
  highlightTheme = "auto",
  showLineNumbers = false,
}: CriticPanelProps) {
  const hasContent = rounds.length > 0 || isStreaming;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5"
           style={{ borderBottom: "1px solid rgba(128,128,128,0.15)" }}>
        <div className="flex h-5 w-5 items-center justify-center rounded"
             style={{ border: "1px solid rgba(128,128,128,0.2)" }}>
          <span className="font-mono text-[10px] font-bold"
                style={{ color: "var(--duo-fg)", opacity: 0.5 }}>B</span>
        </div>
        <span className="text-xs font-medium tracking-wide"
              style={{ color: "var(--duo-fg)", opacity: 0.55 }}>
          Critic
        </span>
        {modelName && (
          <span className="font-mono text-[9px]"
                style={{ color: "var(--duo-fg)", opacity: 0.3 }}>
            {modelName.split(".").pop()?.split("-").slice(0, 3).join("-")}
          </span>
        )}
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 animate-pulse rounded-full" style={{ background: "var(--duo-fg)" }} />
            <span className="font-mono text-[10px]"
                  style={{ color: "var(--duo-fg)", opacity: 0.4 }}>reviewing</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasContent ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs" style={{ color: "var(--duo-fg)", opacity: 0.15 }}>
              awaiting builder
            </p>
          </div>
        ) : (
          <>
            {rounds.map((r) => (
              <div key={r.round}>
                <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 backdrop-blur-sm"
                     style={{
                       background: "color-mix(in srgb, var(--duo-bg) 95%, transparent)",
                       borderBottom: "1px solid rgba(128,128,128,0.08)",
                     }}>
                  <span className="font-mono text-[10px] font-medium"
                        style={{ color: "var(--duo-fg)", opacity: 0.3 }}>
                    round {r.round}
                  </span>
                  {r.converged && (
                    <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-medium"
                          style={{
                            border: "1px solid rgba(128,128,128,0.25)",
                            color: "var(--duo-fg)",
                            opacity: 0.7,
                          }}>
                      CONVERGED
                    </span>
                  )}
                </div>
                <StreamingText content={r.content} isStreaming={false} autoScroll={autoScroll} syntaxHighlighting={syntaxHighlighting} highlightTheme={highlightTheme} showLineNumbers={showLineNumbers} />
              </div>
            ))}
            {isStreaming && (
              <div>
                <div className="sticky top-0 z-10 px-4 py-1.5 backdrop-blur-sm"
                     style={{
                       background: "color-mix(in srgb, var(--duo-bg) 95%, transparent)",
                       borderBottom: "1px solid rgba(128,128,128,0.08)",
                     }}>
                  <span className="font-mono text-[10px] font-medium"
                        style={{ color: "var(--duo-fg)", opacity: 0.5 }}>
                    round {currentRound}
                  </span>
                </div>
                <StreamingText content={currentStreamContent} isStreaming={true} autoScroll={autoScroll} syntaxHighlighting={syntaxHighlighting} highlightTheme={highlightTheme} showLineNumbers={showLineNumbers} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
