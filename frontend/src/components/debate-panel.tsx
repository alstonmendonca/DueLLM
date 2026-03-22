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
  builderModel?: string;
  criticModel?: string;
}

export default function DebatePanel({
  builderRounds,
  criticRounds,
  builderStreaming,
  criticStreaming,
  builderStreamContent,
  criticStreamContent,
  currentRound,
  builderModel,
  criticModel,
}: DebatePanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
      <div className="flex-1 overflow-hidden"
           style={{ borderRight: "1px solid color-mix(in srgb, var(--duo-fg) 8%, transparent)" }}>
        <BuilderPanel
          rounds={builderRounds}
          isStreaming={builderStreaming}
          currentStreamContent={builderStreamContent}
          currentRound={currentRound}
          modelName={builderModel}
        />
      </div>
      <div className="md:hidden" style={{ height: "1px", background: "color-mix(in srgb, var(--duo-fg) 8%, transparent)" }} />
      <div className="flex-1 overflow-hidden">
        <CriticPanel
          rounds={criticRounds}
          isStreaming={criticStreaming}
          currentStreamContent={criticStreamContent}
          currentRound={currentRound}
          modelName={criticModel}
        />
      </div>
    </div>
  );
}
