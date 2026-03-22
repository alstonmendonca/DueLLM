"use client";

import BuilderPanel from "./builder-panel";
import CriticPanel from "./critic-panel";

interface RoundData {
  round: number;
  content: string;
  converged?: boolean;
}

interface DebatePanelProps {
  builderRounds: RoundData[];
  criticRounds: (RoundData & { converged: boolean })[];
  builderStreaming: boolean;
  criticStreaming: boolean;
  builderStreamContent: string;
  criticStreamContent: string;
  currentRound: number;
}

export default function DebatePanel({
  builderRounds,
  criticRounds,
  builderStreaming,
  criticStreaming,
  builderStreamContent,
  criticStreamContent,
  currentRound,
}: DebatePanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
      {/* Builder (left) */}
      <div className="flex-1 overflow-hidden border-r border-neutral-800/30">
        <BuilderPanel
          rounds={builderRounds}
          isStreaming={builderStreaming}
          currentStreamContent={builderStreamContent}
          currentRound={currentRound}
        />
      </div>

      {/* Divider - visible on mobile */}
      <div className="h-px bg-neutral-800/30 md:hidden" />

      {/* Critic (right) */}
      <div className="flex-1 overflow-hidden">
        <CriticPanel
          rounds={criticRounds}
          isStreaming={criticStreaming}
          currentStreamContent={criticStreamContent}
          currentRound={currentRound}
        />
      </div>
    </div>
  );
}
