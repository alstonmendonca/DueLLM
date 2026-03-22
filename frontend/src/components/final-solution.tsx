"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="border-t border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Final Solution
          </span>
          <Badge className="bg-green-950 text-green-400 text-[10px] border-green-900">
            Converged
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="h-7 border-neutral-800 text-xs text-neutral-400 hover:text-neutral-200"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            onClick={onNewDebate}
            variant="outline"
            size="sm"
            className="h-7 border-neutral-800 text-xs text-neutral-400 hover:text-neutral-200"
          >
            New Debate
          </Button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <StreamingText content={solution} isStreaming={false} />
      </div>
    </div>
  );
}
