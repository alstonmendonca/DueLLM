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
      <div className="flex-1 overflow-hidden border-r border-[#F0EDE5]/8">
        <BuilderPanel
          rounds={builderRounds}
          isStreaming={builderStreaming}
          currentStreamContent={builderStreamContent}
          currentRound={currentRound}
        />
      </div>
      <div className="h-px bg-[#F0EDE5]/8 md:hidden" />
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
