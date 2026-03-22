"use client";

import { Separator } from "@/components/ui/separator";
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
      <div className="flex-1 overflow-hidden">
        <BuilderPanel
          rounds={builderRounds}
          isStreaming={builderStreaming}
          currentStreamContent={builderStreamContent}
          currentRound={currentRound}
        />
      </div>
      <Separator orientation="vertical" className="hidden bg-neutral-800 md:block" />
      <Separator className="bg-neutral-800 md:hidden" />
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
