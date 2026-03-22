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
    <div className="border-b border-neutral-800 bg-neutral-950 p-4">
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a coding or architecture problem..."
          className="min-h-[60px] flex-1 resize-none border-neutral-800 bg-black font-mono text-sm text-neutral-200 placeholder:text-neutral-600 focus-visible:ring-neutral-700"
          disabled={isRunning}
        />
        <div className="flex flex-col gap-2">
          {isRunning ? (
            <Button
              onClick={onStop}
              variant="outline"
              className="border-red-900 text-red-400 hover:bg-red-950"
            >
              Stop
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="bg-white text-black hover:bg-neutral-200"
            >
              Debate
            </Button>
          )}
          <Button
            onClick={onOpenSettings}
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-neutral-300"
          >
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
