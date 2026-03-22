"use client";

import { useState, useCallback, useRef } from "react";
import PromptInput from "@/components/prompt-input";
import DebatePanel from "@/components/debate-panel";
import FinalSolution from "@/components/final-solution";
import ThemeSwitcher from "@/components/theme-switcher";
import SettingsDialog, { loadSettings } from "@/components/settings-dialog";
import { startDebate, streamDebate, stopDebate } from "@/lib/api";
import type { DebateEvent, DebateStatus, Settings } from "@/lib/types";

interface RoundContent {
  round: number;
  content: string;
  converged: boolean;
}

export default function Home() {
  const [status, setStatus] = useState<DebateStatus>("idle");
  const [builderRounds, setBuilderRounds] = useState<RoundContent[]>([]);
  const [criticRounds, setCriticRounds] = useState<RoundContent[]>([]);
  const [builderStreamContent, setBuilderStreamContent] = useState("");
  const [criticStreamContent, setCriticStreamContent] = useState("");
  const [builderStreaming, setBuilderStreaming] = useState(false);
  const [criticStreaming, setCriticStreaming] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [finalSolution, setFinalSolution] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [error, setError] = useState<string | null>(null);
  const debateIdRef = useRef<string | null>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const builderStreamRef = useRef("");
  const criticStreamRef = useRef("");

  const resetState = useCallback(() => {
    setBuilderRounds([]);
    setCriticRounds([]);
    setBuilderStreamContent("");
    setCriticStreamContent("");
    setBuilderStreaming(false);
    setCriticStreaming(false);
    setCurrentRound(0);
    setFinalSolution(null);
    setError(null);
    builderStreamRef.current = "";
    criticStreamRef.current = "";
  }, []);

  const handleEvent = useCallback((event: DebateEvent) => {
    switch (event.type) {
      case "builder_start":
        setCurrentRound(event.round || 0);
        builderStreamRef.current = "";
        setBuilderStreamContent("");
        setBuilderStreaming(true);
        setCriticStreaming(false);
        break;
      case "builder_chunk":
        builderStreamRef.current += event.content || "";
        setBuilderStreamContent(builderStreamRef.current);
        break;
      case "builder_end":
        setBuilderStreaming(false);
        setBuilderRounds((prev) => [
          ...prev,
          { round: event.round || 0, content: builderStreamRef.current, converged: false },
        ]);
        builderStreamRef.current = "";
        setBuilderStreamContent("");
        break;
      case "critic_start":
        criticStreamRef.current = "";
        setCriticStreamContent("");
        setCriticStreaming(true);
        break;
      case "critic_chunk":
        criticStreamRef.current += event.content || "";
        setCriticStreamContent(criticStreamRef.current);
        break;
      case "critic_end":
        setCriticStreaming(false);
        setCriticRounds((prev) => [
          ...prev,
          { round: event.round || 0, content: criticStreamRef.current, converged: event.converged || false },
        ]);
        criticStreamRef.current = "";
        setCriticStreamContent("");
        break;
      case "converged":
        setStatus("converged");
        setFinalSolution(event.final_solution || "");
        break;
      case "max_rounds_reached":
        setStatus("stopped");
        setFinalSolution(event.final_solution || "");
        break;
      case "stopped":
        setStatus("stopped");
        break;
      case "error":
        setStatus("error");
        setError(event.content || "Unknown error");
        break;
    }
  }, []);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      resetState();
      setStatus("running");
      try {
        const { debate_id } = await startDebate({
          prompt,
          builder_model: settings.builderModel,
          critic_model: settings.criticModel,
          max_rounds: settings.maxRounds,
          temperature: settings.temperature,
        });
        debateIdRef.current = debate_id;
        const close = streamDebate(debate_id, handleEvent, (err) => {
          setStatus("error");
          setError(err);
        });
        closeStreamRef.current = close;
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to start debate");
      }
    },
    [settings, resetState, handleEvent]
  );

  const handleStop = useCallback(async () => {
    if (debateIdRef.current) await stopDebate(debateIdRef.current);
    closeStreamRef.current?.();
    setStatus("stopped");
  }, []);

  const handleNewDebate = useCallback(() => {
    closeStreamRef.current?.();
    resetState();
    setStatus("idle");
  }, [resetState]);

  const maxRounds = settings.maxRounds;
  const isIdle = status === "idle";

  return (
    <div className="flex h-screen flex-col"
         style={{ background: "var(--duo-bg)", color: "var(--duo-fg)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--duo-fg) 12%, transparent)" }}>
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-base font-bold tracking-widest"
              style={{ color: "var(--duo-fg)" }}>
            Due<span style={{ color: "color-mix(in srgb, var(--duo-fg) 40%, transparent)" }}>LLM</span>
          </h1>

          {status === "running" && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--duo-fg)" }} />
              <span className="font-mono text-[11px]" style={{ color: "color-mix(in srgb, var(--duo-fg) 70%, transparent)" }}>
                Round {currentRound}/{maxRounds}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: maxRounds }, (_, i) => (
                  <div
                    key={i}
                    className="h-1 w-3 rounded-full transition-colors"
                    style={{ background: i < currentRound
                      ? "var(--duo-fg)"
                      : "color-mix(in srgb, var(--duo-fg) 12%, transparent)" }}
                  />
                ))}
              </div>
            </div>
          )}

          {status === "converged" && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--duo-fg)" }} />
              <span className="font-mono text-[11px]" style={{ color: "color-mix(in srgb, var(--duo-fg) 70%, transparent)" }}>
                Converged in {currentRound} round{currentRound !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {status === "stopped" && finalSolution && (
            <span className="font-mono text-[11px]" style={{ color: "color-mix(in srgb, var(--duo-fg) 50%, transparent)" }}>
              Stopped at round {currentRound}
            </span>
          )}

          {status === "error" && (
            <span className="font-mono text-[11px]" style={{ color: "color-mix(in srgb, var(--duo-fg) 50%, transparent)" }}>
              Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[10px] tracking-wide sm:block"
                style={{ color: "color-mix(in srgb, var(--duo-fg) 25%, transparent)" }}>
            adversarial code refinement
          </span>
          <ThemeSwitcher />
        </div>
      </header>

      {/* Prompt */}
      <PromptInput
        onSubmit={handleSubmit}
        onStop={handleStop}
        isRunning={status === "running"}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Error */}
      {error && (
        <div className="px-5 py-2"
             style={{ borderBottom: "1px solid color-mix(in srgb, var(--duo-fg) 12%, transparent)" }}>
          <span className="font-mono text-xs" style={{ color: "color-mix(in srgb, var(--duo-fg) 60%, transparent)" }}>
            {error}
          </span>
        </div>
      )}

      {/* Empty state */}
      {isIdle && builderRounds.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded"
                   style={{ border: "1px solid color-mix(in srgb, var(--duo-fg) 15%, transparent)" }}>
                <span className="font-mono text-xs" style={{ color: "color-mix(in srgb, var(--duo-fg) 35%, transparent)" }}>A</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-px w-8" style={{ background: "color-mix(in srgb, var(--duo-fg) 15%, transparent)" }} />
                <span className="font-mono text-[9px]" style={{ color: "color-mix(in srgb, var(--duo-fg) 25%, transparent)" }}>vs</span>
                <div className="h-px w-8" style={{ background: "color-mix(in srgb, var(--duo-fg) 15%, transparent)" }} />
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded"
                   style={{ border: "1px solid color-mix(in srgb, var(--duo-fg) 15%, transparent)" }}>
                <span className="font-mono text-xs" style={{ color: "color-mix(in srgb, var(--duo-fg) 35%, transparent)" }}>B</span>
              </div>
            </div>
            <p className="max-w-sm text-center text-sm leading-relaxed"
               style={{ color: "color-mix(in srgb, var(--duo-fg) 40%, transparent)" }}>
              Describe a coding or architecture problem. Two LLMs will debate
              to produce a battle-tested solution.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Design a rate limiter in Python",
              "Build a pub/sub event system",
              "Implement JWT auth middleware",
            ].map((example) => (
              <button
                key={example}
                onClick={() => handleSubmit(example)}
                className="rounded px-3 py-1.5 font-mono text-[11px] transition-opacity hover:opacity-80"
                style={{
                  border: "1px solid color-mix(in srgb, var(--duo-fg) 15%, transparent)",
                  color: "color-mix(in srgb, var(--duo-fg) 40%, transparent)",
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Debate */}
      {(!isIdle || builderRounds.length > 0) && (
        <DebatePanel
          builderRounds={builderRounds}
          criticRounds={criticRounds}
          builderStreaming={builderStreaming}
          criticStreaming={criticStreaming}
          builderStreamContent={builderStreamContent}
          criticStreamContent={criticStreamContent}
          currentRound={currentRound}
          builderModel={settings.builderModel}
          criticModel={settings.criticModel}
        />
      )}

      {/* Final solution */}
      {finalSolution && (
        <FinalSolution solution={finalSolution} onNewDebate={handleNewDebate} />
      )}

      {/* Settings */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
      />
    </div>
  );
}
