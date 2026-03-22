"use client";

import StreamingText from "./streaming-text";

interface BuilderPanelProps {
  rounds: { round: number; content: string }[];
  isStreaming: boolean;
  currentStreamContent: string;
  currentRound: number;
}

export default function BuilderPanel({
  rounds,
  isStreaming,
  currentStreamContent,
  currentRound,
}: BuilderPanelProps) {
  const hasContent = rounds.length > 0 || isStreaming;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[#F0EDE5]/8 px-4 py-2.5">
        <div className="flex h-5 w-5 items-center justify-center rounded border border-[#F0EDE5]/15">
          <span className="font-mono text-[10px] font-bold text-[#F0EDE5]/40">A</span>
        </div>
        <span className="text-xs font-medium tracking-wide text-[#F0EDE5]/40">
          Builder
        </span>
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 animate-pulse rounded-full bg-[#F0EDE5]/60" />
            <span className="font-mono text-[10px] text-[#F0EDE5]/30">generating</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasContent ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-xs text-[#F0EDE5]/10">awaiting prompt</p>
          </div>
        ) : (
          <>
            {rounds.map((r) => (
              <div key={r.round}>
                <div className="sticky top-0 z-10 border-b border-[#F0EDE5]/5 bg-[#312F2C]/95 px-4 py-1.5 backdrop-blur-sm">
                  <span className="font-mono text-[10px] font-medium text-[#F0EDE5]/25">
                    round {r.round}
                  </span>
                </div>
                <StreamingText content={r.content} isStreaming={false} />
              </div>
            ))}
            {isStreaming && (
              <div>
                <div className="sticky top-0 z-10 border-b border-[#F0EDE5]/5 bg-[#312F2C]/95 px-4 py-1.5 backdrop-blur-sm">
                  <span className="font-mono text-[10px] font-medium text-[#F0EDE5]/40">
                    round {currentRound}
                  </span>
                </div>
                <StreamingText content={currentStreamContent} isStreaming={true} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
