"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  onStop: () => void;
  isRunning: boolean;
  onOpenSettings: () => void;
}

export default function PromptInput({
  onSubmit,
  onStop,
  isRunning,
  onOpenSettings,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-5 py-4" style={{ borderBottom: "1px solid color-mix(in srgb, var(--duo-fg) 10%, transparent)" }}>
      <div className="mx-auto flex max-w-5xl items-end gap-3">
        <div className="flex-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a coding or architecture problem..."
            rows={2}
            className="min-h-[52px] resize-none font-mono text-sm leading-relaxed focus-visible:ring-1"
            style={{
              background: "var(--duo-bg)",
              color: "var(--duo-fg)",
              borderColor: "color-mix(in srgb, var(--duo-fg) 15%, transparent)",
            }}
            disabled={isRunning}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px]" style={{ color: "color-mix(in srgb, var(--duo-fg) 20%, transparent)" }}>
              {isRunning ? "" : "Cmd+Enter to submit"}
            </span>
            <button
              onClick={onOpenSettings}
              className="font-mono text-[10px] transition-opacity hover:opacity-70"
              style={{ color: "color-mix(in srgb, var(--duo-fg) 30%, transparent)" }}
            >
              settings
            </button>
          </div>
        </div>
        {isRunning ? (
          <Button
            onClick={onStop}
            variant="outline"
            size="sm"
            className="mb-5 h-9 bg-transparent font-mono text-xs transition-opacity hover:opacity-80"
            style={{
              borderColor: "color-mix(in srgb, var(--duo-fg) 25%, transparent)",
              color: "color-mix(in srgb, var(--duo-fg) 60%, transparent)",
            }}
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            size="sm"
            className="mb-5 h-9 font-mono text-xs transition-all disabled:opacity-20"
            style={{ background: "var(--duo-fg)", color: "var(--duo-bg)" }}
          >
            Debate
          </Button>
        )}
      </div>
    </div>
  );
}
