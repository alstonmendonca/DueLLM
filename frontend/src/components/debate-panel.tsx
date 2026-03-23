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
  layoutDirection: "horizontal" | "vertical";
  autoScroll: boolean;
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
  layoutDirection,
  autoScroll,
}: DebatePanelProps) {
  const isHorizontal = layoutDirection === "horizontal";

  return (
    <div className={`flex min-h-0 flex-1 ${isHorizontal ? "flex-col md:flex-row" : "flex-col"}`}>
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          borderRight: isHorizontal ? "1px solid rgba(128,128,128,0.15)" : "none",
          borderBottom: isHorizontal ? "none" : "1px solid rgba(128,128,128,0.15)",
        }}
      >
        <BuilderPanel
          rounds={builderRounds}
          isStreaming={builderStreaming}
          currentStreamContent={builderStreamContent}
          currentRound={currentRound}
          modelName={builderModel}
          autoScroll={autoScroll}
        />
      </div>
      {isHorizontal && (
        <div className="h-px md:hidden" style={{ background: "rgba(128,128,128,0.15)" }} />
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <CriticPanel
          rounds={criticRounds}
          isStreaming={criticStreaming}
          currentStreamContent={criticStreamContent}
          currentRound={currentRound}
          modelName={criticModel}
          autoScroll={autoScroll}
        />
      </div>
    </div>
  );
}
