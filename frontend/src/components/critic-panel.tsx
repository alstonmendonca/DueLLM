"use client";

import StreamingText from "./streaming-text";

interface CriticPanelProps {
  rounds: { round: number; content: string; converged: boolean }[];
  isStreaming: boolean;
  currentStreamContent: string;
  currentRound: number;
}

export default function CriticPanel({
  rounds,
  isStreaming,
  currentStreamContent,
  currentRound,
}: CriticPanelProps) {
  const hasContent = rounds.length > 0 || isStreaming;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-neutral-800/50 px-4 py-2.5">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-800">
          <span className="font-mono text-[10px] font-bold text-neutral-400">B</span>
        </div>
        <span className="text-xs font-medium tracking-wide text-neutral-400">
          Critic
        </span>
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 animate-pulse rounded-full bg-yellow-500" />
            <span className="text-[10px] text-yellow-600">reviewing</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasContent ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs text-neutral-800">
              awaiting builder
            </p>
          </div>
        ) : (
          <>
            {rounds.map((r) => (
              <div key={r.round}>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-900/50 bg-black/80 px-4 py-1.5 backdrop-blur-sm">
                  <span className="font-mono text-[10px] font-medium text-neutral-600">
                    round {r.round}
                  </span>
                  {r.converged && (
                    <span className="rounded bg-green-950 px-1.5 py-0.5 font-mono text-[9px] font-medium text-green-400">
                      CONVERGED
                    </span>
                  )}
                </div>
                <StreamingText content={r.content} isStreaming={false} />
              </div>
            ))}
            {isStreaming && (
              <div>
                <div className="sticky top-0 z-10 border-b border-neutral-900/50 bg-black/80 px-4 py-1.5 backdrop-blur-sm">
                  <span className="font-mono text-[10px] font-medium text-yellow-600">
                    round {currentRound}
                  </span>
                </div>
                <StreamingText
                  content={currentStreamContent}
                  isStreaming={true}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
