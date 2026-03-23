"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import StreamingText from "./streaming-text";

interface RoundContent {
  round: number;
  content: string;
  converged: boolean;
}

interface FinalSolutionProps {
  solution: string;
  onNewDebate: () => void;
  exportFormat: "markdown" | "json" | "both";
  builderRounds: RoundContent[];
  criticRounds: RoundContent[];
  autoScroll?: boolean;
}

function buildMarkdownExport(
  solution: string,
  builderRounds: RoundContent[],
  criticRounds: RoundContent[]
): string {
  const lines = ["# DueLLM Debate Export\n"];
  const maxRound = Math.max(
    builderRounds.length,
    criticRounds.length
  );
  for (let i = 0; i < maxRound; i++) {
    lines.push(`## Round ${i + 1}\n`);
    if (builderRounds[i]) {
      lines.push(`### Builder\n\n${builderRounds[i].content}\n`);
    }
    if (criticRounds[i]) {
      lines.push(`### Critic\n\n${criticRounds[i].content}\n`);
    }
  }
  lines.push(`## Final Solution\n\n${solution}`);
  return lines.join("\n");
}

function buildJsonExport(
  solution: string,
  builderRounds: RoundContent[],
  criticRounds: RoundContent[]
): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      rounds: Array.from(
        { length: Math.max(builderRounds.length, criticRounds.length) },
        (_, i) => ({
          round: i + 1,
          builder: builderRounds[i]?.content || null,
          critic: criticRounds[i]?.content || null,
          converged: criticRounds[i]?.converged || false,
        })
      ),
      final_solution: solution,
    },
    null,
    2
  );
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinalSolution({
  solution,
  onNewDebate,
  exportFormat,
  builderRounds,
  criticRounds,
  autoScroll = true,
}: FinalSolutionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const ts = new Date().toISOString().slice(0, 10);
    if (exportFormat === "markdown" || exportFormat === "both") {
      const md = buildMarkdownExport(solution, builderRounds, criticRounds);
      downloadFile(md, `duellm-${ts}.md`, "text/markdown");
    }
    if (exportFormat === "json" || exportFormat === "both") {
      const json = buildJsonExport(solution, builderRounds, criticRounds);
      downloadFile(json, `duellm-${ts}.json`, "application/json");
    }
  };

  const btnStyle = {
    borderColor: "rgba(128,128,128,0.2)",
    color: "var(--duo-fg)",
    opacity: 0.5,
  };

  return (
    <div style={{ borderTop: "1px solid rgba(128,128,128,0.18)" }}>
      <div className="flex items-center justify-between px-5 py-2.5"
           style={{ borderBottom: "1px solid rgba(128,128,128,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--duo-fg)" }} />
          <span className="font-mono text-xs font-medium tracking-wide"
                style={{ color: "var(--duo-fg)", opacity: 0.7 }}>
            Final Solution
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="h-7 bg-transparent font-mono text-[11px] transition-opacity hover:opacity-80"
            style={btnStyle}
          >
            {copied ? "copied" : "copy"}
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="h-7 bg-transparent font-mono text-[11px] transition-opacity hover:opacity-80"
            style={btnStyle}
          >
            export
          </Button>
          <Button
            onClick={onNewDebate}
            variant="outline"
            size="sm"
            className="h-7 bg-transparent font-mono text-[11px] transition-opacity hover:opacity-80"
            style={btnStyle}
          >
            new debate
          </Button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        <StreamingText content={solution} isStreaming={false} autoScroll={autoScroll} />
      </div>
    </div>
  );
}
