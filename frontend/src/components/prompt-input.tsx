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
    <div className="border-b border-[#F0EDE5]/10 px-5 py-4">
      <div className="mx-auto flex max-w-5xl items-end gap-3">
        <div className="flex-1">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a coding or architecture problem..."
            rows={2}
            className="min-h-[52px] resize-none border-[#F0EDE5]/10 bg-[#312F2C] font-mono text-sm leading-relaxed text-[#F0EDE5] placeholder:text-[#F0EDE5]/20 focus-visible:ring-1 focus-visible:ring-[#F0EDE5]/20"
            disabled={isRunning}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#F0EDE5]/15">
              {isRunning ? "" : "Cmd+Enter to submit"}
            </span>
            <button
              onClick={onOpenSettings}
              className="font-mono text-[10px] text-[#F0EDE5]/20 transition-colors hover:text-[#F0EDE5]/50"
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
            className="mb-5 h-9 border-[#F0EDE5]/20 bg-transparent font-mono text-xs text-[#F0EDE5]/50 hover:border-[#F0EDE5]/40 hover:bg-[#F0EDE5]/5 hover:text-[#F0EDE5]/70"
          >
            Stop
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            size="sm"
            className="mb-5 h-9 bg-[#F0EDE5] font-mono text-xs text-[#312F2C] transition-all hover:bg-[#F0EDE5]/90 disabled:bg-[#F0EDE5]/10 disabled:text-[#F0EDE5]/20"
          >
            Debate
          </Button>
        )}
      </div>
    </div>
  );
}
