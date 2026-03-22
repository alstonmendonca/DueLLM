"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import StreamingText from "./streaming-text";

interface FinalSolutionProps {
  solution: string;
  onNewDebate: () => void;
}

export default function FinalSolution({ solution, onNewDebate }: FinalSolutionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ borderTop: "1px solid color-mix(in srgb, var(--duo-fg) 18%, transparent)" }}>
      <div className="flex items-center justify-between px-5 py-2.5"
           style={{ borderBottom: "1px solid color-mix(in srgb, var(--duo-fg) 10%, transparent)" }}>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--duo-fg)" }} />
          <span className="font-mono text-xs font-medium tracking-wide"
                style={{ color: "color-mix(in srgb, var(--duo-fg) 70%, transparent)" }}>
            Final Solution
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="h-7 bg-transparent font-mono text-[11px] transition-opacity hover:opacity-80"
            style={{
              borderColor: "color-mix(in srgb, var(--duo-fg) 20%, transparent)",
              color: "color-mix(in srgb, var(--duo-fg) 50%, transparent)",
            }}
          >
            {copied ? "copied" : "copy"}
          </Button>
          <Button
            onClick={onNewDebate}
            variant="outline"
            size="sm"
            className="h-7 bg-transparent font-mono text-[11px] transition-opacity hover:opacity-80"
            style={{
              borderColor: "color-mix(in srgb, var(--duo-fg) 20%, transparent)",
              color: "color-mix(in srgb, var(--duo-fg) 50%, transparent)",
            }}
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
