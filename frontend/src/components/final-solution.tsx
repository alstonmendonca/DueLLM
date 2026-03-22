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
    <div className="border-t border-[#F0EDE5]/15">
      <div className="flex items-center justify-between border-b border-[#F0EDE5]/8 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-[#F0EDE5]" />
          <span className="font-mono text-xs font-medium tracking-wide text-[#F0EDE5]/60">
            Final Solution
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="h-7 border-[#F0EDE5]/15 bg-transparent font-mono text-[11px] text-[#F0EDE5]/40 hover:border-[#F0EDE5]/30 hover:bg-[#F0EDE5]/5 hover:text-[#F0EDE5]/60"
          >
            {copied ? "copied" : "copy"}
          </Button>
          <Button
            onClick={onNewDebate}
            variant="outline"
            size="sm"
            className="h-7 border-[#F0EDE5]/15 bg-transparent font-mono text-[11px] text-[#F0EDE5]/40 hover:border-[#F0EDE5]/30 hover:bg-[#F0EDE5]/5 hover:text-[#F0EDE5]/60"
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
