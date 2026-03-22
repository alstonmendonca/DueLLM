"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import StreamingText from "./streaming-text";

interface FinalSolutionProps {
  solution: string;
  onNewDebate: () => void;
}

export default function FinalSolution({
  solution,
  onNewDebate,
}: FinalSolutionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-green-900/30 bg-green-950/10">
      <div className="flex items-center justify-between border-b border-neutral-800/50 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="font-mono text-xs font-medium tracking-wide text-green-400">
            Final Solution
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="h-7 border-neutral-800 font-mono text-[11px] text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
          >
            {copied ? "copied" : "copy"}
          </Button>
          <Button
            onClick={onNewDebate}
            variant="outline"
            size="sm"
            className="h-7 border-neutral-800 font-mono text-[11px] text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
          >
            new debate
          </Button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <StreamingText content={solution} isStreaming={false} />
      </div>
    </div>
  );
}
