"use client";

import { useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import PromptInput from "@/components/prompt-input";
import DebatePanel from "@/components/debate-panel";
import FinalSolution from "@/components/final-solution";
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
          {
            round: event.round || 0,
            content: builderStreamRef.current,
            converged: false,
          },
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
          {
            round: event.round || 0,
            content: criticStreamRef.current,
            converged: event.converged || false,
          },
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

        const close = streamDebate(
          debate_id,
          handleEvent,
          (err) => {
            setStatus("error");
            setError(err);
          }
        );
        closeStreamRef.current = close;
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to start debate"
        );
      }
    },
    [settings, resetState, handleEvent]
  );

  const handleStop = useCallback(async () => {
    if (debateIdRef.current) {
      await stopDebate(debateIdRef.current);
    }
    closeStreamRef.current?.();
    setStatus("stopped");
  }, []);

  const handleNewDebate = useCallback(() => {
    closeStreamRef.current?.();
    resetState();
    setStatus("idle");
  }, [resetState]);

  return (
    <div className="flex h-screen flex-col bg-black">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-sm font-bold tracking-wider text-neutral-200">
            DueLLM
          </h1>
          {status === "running" && (
            <Badge
              variant="outline"
              className="border-yellow-900 text-yellow-500 text-[10px]"
            >
              Round {currentRound}
            </Badge>
          )}
          {status === "converged" && (
            <Badge className="bg-green-950 text-green-400 text-[10px] border-green-900">
              Converged
            </Badge>
          )}
          {status === "error" && (
            <Badge className="bg-red-950 text-red-400 text-[10px] border-red-900">
              Error
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-neutral-700">
          Two LLMs debate to produce better code
        </span>
      </header>

      <PromptInput
        onSubmit={handleSubmit}
        onStop={handleStop}
        isRunning={status === "running"}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {error && (
        <div className="border-b border-red-900 bg-red-950/50 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <DebatePanel
        builderRounds={builderRounds}
        criticRounds={criticRounds}
        builderStreaming={builderStreaming}
        criticStreaming={criticStreaming}
        builderStreamContent={builderStreamContent}
        criticStreamContent={criticStreamContent}
        currentRound={currentRound}
      />

      {finalSolution && (
        <FinalSolution
          solution={finalSolution}
          onNewDebate={handleNewDebate}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
      />
    </div>
  );
}
