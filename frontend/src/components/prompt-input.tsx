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
    <div className="border-b border-neutral-800/50 bg-neutral-950 px-5 py-4">
      <div className="mx-auto flex max-w-5xl items-end gap-3">
        <div className="flex-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a coding or architecture problem..."
            rows={2}
            className="min-h-[52px] resize-none border-neutral-800 bg-black font-mono text-sm leading-relaxed text-neutral-200 placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-neutral-700"
            disabled={isRunning}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-700">
              {isRunning ? "" : "Cmd+Enter to submit"}
            </span>
            <button
              onClick={onOpenSettings}
              className="font-mono text-[10px] text-neutral-600 transition-colors hover:text-neutral-400"
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
            className="mb-5 h-9 border-red-900/50 font-mono text-xs text-red-400 hover:border-red-800 hover:bg-red-950/50"
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            size="sm"
            className="mb-5 h-9 bg-white font-mono text-xs text-black transition-all hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600"
          >
            Debate
          </Button>
        )}
      </div>
    </div>
  );
}
