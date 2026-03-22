"use client";

import { Badge } from "@/components/ui/badge";
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
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Critic
        </span>
        <Badge variant="outline" className="border-neutral-700 text-neutral-500 text-[10px]">
          LLM B
        </Badge>
      </div>
      <div className="flex-1 overflow-hidden">
        {rounds.length === 0 && !isStreaming ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-700">
              Waiting for builder...
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {rounds.map((r) => (
              <div key={r.round} className="border-b border-neutral-900">
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                    Round {r.round}
                  </span>
                  {r.converged && (
                    <Badge className="bg-green-950 text-green-400 text-[10px] border-green-900">
                      Converged
                    </Badge>
                  )}
                </div>
                <StreamingText content={r.content} isStreaming={false} />
              </div>
            ))}
            {isStreaming && (
              <div className="border-b border-neutral-900">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                    Round {currentRound}
                  </span>
                </div>
                <StreamingText
                  content={currentStreamContent}
                  isStreaming={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
