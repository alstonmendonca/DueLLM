"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getModels, getDefaults } from "@/lib/api";
import type { Settings, BedrockModel, Defaults, DebatePreset, Provider } from "@/lib/types";

const STORAGE_KEY = "duellm-settings";
const PRESETS_KEY = "duellm-presets";

const DEFAULT_SETTINGS: Settings = {
  builderProvider: "bedrock",
  criticProvider: "bedrock",
  sameProvider: true,
  builderModel: "us.anthropic.claude-sonnet-4-6",
  criticModel: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  maxRounds: 5,
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  builderSystemPrompt: "",
  criticSystemPrompt: "",
  convergenceKeyword: "CONVERGED",
  autoScroll: true,
  exportFormat: "markdown",
  fontSize: 13,
  layoutDirection: "horizontal",
  customBg: "#312F2C",
  customFg: "#F0EDE5",
  useCustomTheme: false,
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadPresets(): DebatePreset[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: DebatePreset[]): void {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

type Tab = "models" | "prompts" | "debate" | "appearance";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}

export default function SettingsDialog({
  open,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [models, setModels] = useState<BedrockModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [tab, setTab] = useState<Tab>("models");
  const [presets, setPresets] = useState<DebatePreset[]>([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setPresets(loadPresets());
      setLoadingModels(true);
      getModels()
        .then(setModels)
        .catch(() => setModels([]))
        .finally(() => setLoadingModels(false));
      getDefaults().then((d) => d && setDefaults(d));
    }
  }, [open]);

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    saveSettings(settings);
    onSave(settings);
    onClose();
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const updated = [
      ...presets.filter((p) => p.name !== name),
      { name, settings: { ...settings } },
    ];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
  };

  const handleLoadPreset = (preset: DebatePreset) => {
    setSettings({ ...preset.settings });
  };

  const handleDeletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    savePresets(updated);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "models", label: "Models" },
    { key: "prompts", label: "Prompts" },
    { key: "debate", label: "Debate" },
    { key: "appearance", label: "Appearance" },
  ];

  const ollamaModels = models.filter((m) => m.model_id.startsWith("ollama:"));
  const bedrockModels = models.filter((m) => !m.model_id.startsWith("ollama:"));
  const hasOllama = ollamaModels.length > 0;

  const modelsForProvider = (provider: Provider) =>
    provider === "ollama" ? ollamaModels : bedrockModels;

  const providerToggle = (
    label: string,
    value: Provider,
    onChange: (v: Provider) => void,
    disabled?: boolean
  ) => (
    <div className="space-y-1.5">
      <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
        {label}
      </Label>
      <div className="flex gap-1">
        {(["bedrock", "ollama"] as const).map((p) => (
          <button
            key={p}
            onClick={() => !disabled && onChange(p)}
            disabled={disabled}
            className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed"
            style={{
              borderColor: "rgba(128,128,128,0.2)",
              backgroundColor: value === p ? "var(--duo-fg)" : "transparent",
              color: value === p ? "var(--duo-bg)" : "var(--duo-fg)",
              opacity: disabled ? 0.3 : value === p ? 1 : 0.5,
            }}
          >
            {p === "bedrock" ? "Bedrock" : `Ollama${hasOllama ? "" : " (offline)"}`}
          </button>
        ))}
      </div>
    </div>
  );

  const modelSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    provider: Provider
  ) => {
    const filtered = modelsForProvider(provider);
    return (
      <div className="space-y-1.5">
        <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
          {label}
        </Label>
        {loadingModels ? (
          <div className="rounded border px-3 py-2 font-mono text-xs" style={{ borderColor: "var(--duo-fg)", opacity: 0.1, color: "var(--duo-fg)" }}>
            Loading models...
          </div>
        ) : filtered.length > 0 ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1"
            style={{
              borderColor: "rgba(128,128,128,0.2)",
              backgroundColor: "var(--duo-bg)",
              color: "var(--duo-fg)",
            }}
          >
            {filtered.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.model_name} ({m.provider})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={provider === "ollama" ? "e.g. ollama:llama3" : "e.g. us.anthropic.claude-sonnet-4-6"}
            className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1"
            style={{
              borderColor: "rgba(128,128,128,0.2)",
              backgroundColor: "var(--duo-bg)",
              color: "var(--duo-fg)",
            }}
          />
        )}
      </div>
    );
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    format?: (v: number) => string
  ) => (
    <div className="space-y-1.5">
      <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
        {label} ({format ? format(value) : value})
      </Label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--duo-fg)" }}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        style={{
          backgroundColor: "var(--duo-bg)",
          color: "var(--duo-fg)",
          borderColor: "rgba(128,128,128,0.15)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-bold tracking-wide" style={{ color: "var(--duo-fg)" }}>
            Settings
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b pb-2" style={{ borderColor: "rgba(128,128,128,0.15)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="rounded px-2.5 py-1 font-mono text-[11px] transition-colors"
              style={{
                backgroundColor: tab === t.key ? "var(--duo-fg)" : "transparent",
                color: tab === t.key ? "var(--duo-bg)" : "var(--duo-fg)",
                opacity: tab === t.key ? 1 : 0.5,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex max-h-80 flex-col gap-4 overflow-y-auto py-2">
          {tab === "models" && (
            <>
              {/* Same provider toggle */}
              <div className="flex items-center justify-between">
                <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                  Same provider for both
                </Label>
                <button
                  onClick={() => {
                    const next = !settings.sameProvider;
                    const patch: Partial<Settings> = { sameProvider: next };
                    if (next) {
                      patch.criticProvider = settings.builderProvider;
                    }
                    update(patch);
                  }}
                  className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors"
                  style={{
                    borderColor: "rgba(128,128,128,0.2)",
                    backgroundColor: settings.sameProvider ? "var(--duo-fg)" : "transparent",
                    color: settings.sameProvider ? "var(--duo-bg)" : "var(--duo-fg)",
                    opacity: settings.sameProvider ? 1 : 0.5,
                  }}
                >
                  {settings.sameProvider ? "ON" : "OFF"}
                </button>
              </div>

              {/* Provider selectors */}
              {settings.sameProvider ? (
                providerToggle("Provider", settings.builderProvider, (v) =>
                  update({ builderProvider: v, criticProvider: v })
                )
              ) : (
                <>
                  {providerToggle("Builder Provider", settings.builderProvider, (v) =>
                    update({ builderProvider: v })
                  )}
                  {providerToggle("Critic Provider", settings.criticProvider, (v) =>
                    update({ criticProvider: v })
                  )}
                </>
              )}

              <div className="border-t pt-3" style={{ borderColor: "rgba(128,128,128,0.15)" }} />

              {/* Model selectors */}
              {modelSelect("Builder Model (LLM A)", settings.builderModel, (v) => update({ builderModel: v }), settings.builderProvider)}
              {modelSelect("Critic Model (LLM B)", settings.criticModel, (v) => update({ criticModel: v }), settings.criticProvider)}

              {slider("Temperature", settings.temperature, 0, 1, 0.1, (v) => update({ temperature: v }), (v) => v.toFixed(1))}
              {slider("Max Tokens", settings.maxTokens, 512, 16384, 512, (v) => update({ maxTokens: v }), (v) => v.toLocaleString())}
              {slider("Top P", settings.topP, 0, 1, 0.05, (v) => update({ topP: v }), (v) => v.toFixed(2))}
            </>
          )}

          {tab === "prompts" && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                    Builder System Prompt
                  </Label>
                  <button
                    onClick={() => update({ builderSystemPrompt: "" })}
                    className="font-mono text-[10px] transition-opacity hover:opacity-70"
                    style={{ color: "var(--duo-fg)", opacity: 0.3 }}
                  >
                    reset to default
                  </button>
                </div>
                <Textarea
                  value={settings.builderSystemPrompt}
                  onChange={(e) => update({ builderSystemPrompt: e.target.value })}
                  placeholder={defaults?.builder_system_prompt || "Leave empty for default..."}
                  rows={4}
                  className="resize-none font-mono text-[11px] leading-relaxed"
                  style={{
                    backgroundColor: "var(--duo-bg)",
                    color: "var(--duo-fg)",
                    borderColor: "rgba(128,128,128,0.2)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                    Critic System Prompt
                  </Label>
                  <button
                    onClick={() => update({ criticSystemPrompt: "" })}
                    className="font-mono text-[10px] transition-opacity hover:opacity-70"
                    style={{ color: "var(--duo-fg)", opacity: 0.3 }}
                  >
                    reset to default
                  </button>
                </div>
                <Textarea
                  value={settings.criticSystemPrompt}
                  onChange={(e) => update({ criticSystemPrompt: e.target.value })}
                  placeholder={defaults?.critic_system_prompt || "Leave empty for default..."}
                  rows={4}
                  className="resize-none font-mono text-[11px] leading-relaxed"
                  style={{
                    backgroundColor: "var(--duo-bg)",
                    color: "var(--duo-fg)",
                    borderColor: "rgba(128,128,128,0.2)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                  Convergence Keyword
                </Label>
                <input
                  type="text"
                  value={settings.convergenceKeyword}
                  onChange={(e) => update({ convergenceKeyword: e.target.value })}
                  className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1"
                  style={{
                    borderColor: "rgba(128,128,128,0.2)",
                    backgroundColor: "var(--duo-bg)",
                    color: "var(--duo-fg)",
                  }}
                />
                <p className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>
                  The Critic uses this word to signal the solution is ready.
                </p>
              </div>
            </>
          )}

          {tab === "debate" && (
            <>
              {slider("Max Rounds", settings.maxRounds, 1, 10, 1, (v) => update({ maxRounds: v }))}
              <div className="flex items-center justify-between">
                <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                  Auto-scroll during streaming
                </Label>
                <button
                  onClick={() => update({ autoScroll: !settings.autoScroll })}
                  className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors"
                  style={{
                    borderColor: "rgba(128,128,128,0.2)",
                    backgroundColor: settings.autoScroll ? "var(--duo-fg)" : "transparent",
                    color: settings.autoScroll ? "var(--duo-bg)" : "var(--duo-fg)",
                    opacity: settings.autoScroll ? 1 : 0.5,
                  }}
                >
                  {settings.autoScroll ? "ON" : "OFF"}
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                  Export Format
                </Label>
                <div className="flex gap-1">
                  {(["markdown", "json", "both"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => update({ exportFormat: fmt })}
                      className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors"
                      style={{
                        borderColor: "rgba(128,128,128,0.2)",
                        backgroundColor: settings.exportFormat === fmt ? "var(--duo-fg)" : "transparent",
                        color: settings.exportFormat === fmt ? "var(--duo-bg)" : "var(--duo-fg)",
                        opacity: settings.exportFormat === fmt ? 1 : 0.5,
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              {/* Presets */}
              <div className="space-y-2 border-t pt-3" style={{ borderColor: "rgba(128,128,128,0.15)" }}>
                <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                  Presets
                </Label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="flex-1 rounded border px-2.5 py-1.5 font-mono text-[11px] focus:outline-none focus:ring-1"
                    style={{
                      borderColor: "rgba(128,128,128,0.2)",
                      backgroundColor: "var(--duo-bg)",
                      color: "var(--duo-fg)",
                    }}
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="rounded border px-2.5 py-1.5 font-mono text-[11px] transition-opacity hover:opacity-80 disabled:opacity-20"
                    style={{
                      borderColor: "rgba(128,128,128,0.2)",
                      color: "var(--duo-fg)",
                    }}
                  >
                    save
                  </button>
                </div>
                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((p) => (
                      <div key={p.name} className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadPreset(p)}
                          className="rounded border px-2 py-1 font-mono text-[10px] transition-opacity hover:opacity-80"
                          style={{
                            borderColor: "rgba(128,128,128,0.2)",
                            color: "var(--duo-fg)",
                            opacity: 0.6,
                          }}
                        >
                          {p.name}
                        </button>
                        <button
                          onClick={() => handleDeletePreset(p.name)}
                          className="font-mono text-[10px] transition-opacity hover:opacity-80"
                          style={{ color: "var(--duo-fg)", opacity: 0.3 }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "appearance" && (
            <>
              {slider("Font Size", settings.fontSize, 11, 16, 1, (v) => update({ fontSize: v }), (v) => `${v}px`)}
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                  Layout Direction
                </Label>
                <div className="flex gap-1">
                  {(["horizontal", "vertical"] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => update({ layoutDirection: dir })}
                      className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors"
                      style={{
                        borderColor: "rgba(128,128,128,0.2)",
                        backgroundColor: settings.layoutDirection === dir ? "var(--duo-fg)" : "transparent",
                        color: settings.layoutDirection === dir ? "var(--duo-bg)" : "var(--duo-fg)",
                        opacity: settings.layoutDirection === dir ? 1 : 0.5,
                      }}
                    >
                      {dir === "horizontal" ? "side by side" : "stacked"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Custom theme */}
              <div className="space-y-2 border-t pt-3" style={{ borderColor: "rgba(128,128,128,0.15)" }}>
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-[11px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>
                    Custom Theme Colors
                  </Label>
                  <button
                    onClick={() => update({ useCustomTheme: !settings.useCustomTheme })}
                    className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors"
                    style={{
                      borderColor: "rgba(128,128,128,0.2)",
                      backgroundColor: settings.useCustomTheme ? "var(--duo-fg)" : "transparent",
                      color: settings.useCustomTheme ? "var(--duo-bg)" : "var(--duo-fg)",
                      opacity: settings.useCustomTheme ? 1 : 0.5,
                    }}
                  >
                    {settings.useCustomTheme ? "ON" : "OFF"}
                  </button>
                </div>
                {settings.useCustomTheme && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>BG</label>
                      <input
                        type="color"
                        value={settings.customBg}
                        onChange={(e) => update({ customBg: e.target.value })}
                        className="h-7 w-10 cursor-pointer rounded border-0"
                      />
                      <span className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>{settings.customBg}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>FG</label>
                      <input
                        type="color"
                        value={settings.customFg}
                        onChange={(e) => update({ customFg: e.target.value })}
                        className="h-7 w-10 cursor-pointer rounded border-0"
                      />
                      <span className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>{settings.customFg}</span>
                    </div>
                  </div>
                )}
                {settings.useCustomTheme && (
                  <div
                    className="flex h-10 items-center justify-center rounded font-mono text-xs"
                    style={{ backgroundColor: settings.customBg, color: settings.customFg, border: `1px solid ${settings.customFg}40` }}
                  >
                    Preview: DueLLM
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Button
          onClick={handleSave}
          className="font-mono text-xs"
          style={{ background: "var(--duo-fg)", color: "var(--duo-bg)" }}
        >
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
