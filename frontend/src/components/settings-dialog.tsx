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
import type { Settings, BedrockModel, Defaults, DebatePreset, Provider, JudgeMode, DiffStyle, HighlightTheme } from "@/lib/types";

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
  // Judge
  judgeMode: "off",
  judgeProvider: "bedrock",
  judgeModel: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  judgeScoringScale: "1-10",
  // Prompts
  builderSystemPrompt: "",
  criticSystemPrompt: "",
  convergenceKeyword: "CONVERGED",
  judgeSystemPrompt: "",
  // Debate
  autoScroll: true,
  exportFormat: "markdown",
  autoSaveDebates: true,
  maxSavedDebates: 50,
  saveIncomplete: false,
  showDiffButtons: true,
  diffStyle: "unified",
  diffContextLines: 3,
  // Appearance
  fontSize: 13,
  layoutDirection: "horizontal",
  customBg: "#312F2C",
  customFg: "#F0EDE5",
  useCustomTheme: false,
  syntaxHighlighting: true,
  highlightTheme: "auto",
  showLineNumbers: false,
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

// Reusable toggle button
function ToggleBtn({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded border px-2.5 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed"
      style={{
        borderColor: "rgba(128,128,128,0.2)",
        backgroundColor: active ? "var(--duo-fg)" : "transparent",
        color: active ? "var(--duo-bg)" : "var(--duo-fg)",
        opacity: disabled ? 0.3 : active ? 1 : 0.5,
      }}
    >
      {label}
    </button>
  );
}

export default function SettingsDialog({ open, onClose, onSave }: SettingsDialogProps) {
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
    const updated = [...presets.filter((p) => p.name !== name), { name, settings: { ...settings } }];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
  };

  const handleLoadPreset = (preset: DebatePreset) => setSettings({ ...preset.settings });
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

  // Helpers
  const ollamaModels = models.filter((m) => m.model_id.startsWith("ollama:"));
  const bedrockModels = models.filter((m) => !m.model_id.startsWith("ollama:"));
  const hasOllama = ollamaModels.length > 0;
  const modelsForProvider = (p: Provider) => (p === "ollama" ? ollamaModels : bedrockModels);

  const lblStyle = { color: "var(--duo-fg)", opacity: 0.4 } as const;
  const inputStyle = { borderColor: "rgba(128,128,128,0.2)", backgroundColor: "var(--duo-bg)", color: "var(--duo-fg)" } as const;
  const sectionBorder = { borderColor: "rgba(128,128,128,0.15)" } as const;

  const providerBtns = (value: Provider, onChange: (v: Provider) => void, disabled?: boolean) => (
    <div className="flex gap-1">
      {(["bedrock", "ollama"] as const).map((p) => (
        <ToggleBtn key={p} label={p === "bedrock" ? "Bedrock" : `Ollama${hasOllama ? "" : " (offline)"}`} active={value === p} onClick={() => onChange(p)} disabled={disabled} />
      ))}
    </div>
  );

  const modelDropdown = (label: string, value: string, onChange: (v: string) => void, provider: Provider) => {
    const filtered = modelsForProvider(provider);
    return (
      <div className="space-y-1.5">
        <Label className="font-mono text-[11px]" style={lblStyle}>{label}</Label>
        {loadingModels ? (
          <div className="rounded border px-3 py-2 font-mono text-xs" style={{ ...inputStyle, opacity: 0.3 }}>Loading...</div>
        ) : filtered.length > 0 ? (
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1" style={inputStyle}>
            {filtered.map((m) => (
              <option key={m.model_id} value={m.model_id}>{m.model_name} ({m.provider})</option>
            ))}
          </select>
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={provider === "ollama" ? "ollama:llama3" : "model-id"} className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1" style={inputStyle} />
        )}
      </div>
    );
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, fmt?: (v: number) => string) => (
    <div className="space-y-1.5">
      <Label className="font-mono text-[11px]" style={lblStyle}>{label} ({fmt ? fmt(value) : value})</Label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" style={{ accentColor: "var(--duo-fg)" }} />
    </div>
  );

  const row = (label: string, children: React.ReactNode) => (
    <div className="flex items-center justify-between">
      <Label className="font-mono text-[11px]" style={lblStyle}>{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" style={{ backgroundColor: "var(--duo-bg)", color: "var(--duo-fg)", borderColor: "rgba(128,128,128,0.15)" }}>
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-bold tracking-wide" style={{ color: "var(--duo-fg)" }}>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b pb-2" style={sectionBorder}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="rounded px-2.5 py-1 font-mono text-[11px] transition-colors" style={{ backgroundColor: tab === t.key ? "var(--duo-fg)" : "transparent", color: tab === t.key ? "var(--duo-bg)" : "var(--duo-fg)", opacity: tab === t.key ? 1 : 0.5 }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex max-h-96 flex-col gap-4 overflow-y-auto py-2">
          {/* ===== MODELS TAB ===== */}
          {tab === "models" && (
            <>
              {row("Same provider for both", <ToggleBtn label={settings.sameProvider ? "ON" : "OFF"} active={settings.sameProvider} onClick={() => { const next = !settings.sameProvider; update(next ? { sameProvider: next, criticProvider: settings.builderProvider } : { sameProvider: next }); }} />)}

              {settings.sameProvider ? (
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px]" style={lblStyle}>Provider</Label>
                  {providerBtns(settings.builderProvider, (v) => update({ builderProvider: v, criticProvider: v }))}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5"><Label className="font-mono text-[11px]" style={lblStyle}>Builder Provider</Label>{providerBtns(settings.builderProvider, (v) => update({ builderProvider: v }))}</div>
                  <div className="space-y-1.5"><Label className="font-mono text-[11px]" style={lblStyle}>Critic Provider</Label>{providerBtns(settings.criticProvider, (v) => update({ criticProvider: v }))}</div>
                </>
              )}

              <div className="border-t pt-3" style={sectionBorder} />
              {modelDropdown("Builder Model (LLM A)", settings.builderModel, (v) => update({ builderModel: v }), settings.builderProvider)}
              {modelDropdown("Critic Model (LLM B)", settings.criticModel, (v) => update({ criticModel: v }), settings.criticProvider)}
              {slider("Temperature", settings.temperature, 0, 1, 0.1, (v) => update({ temperature: v }), (v) => v.toFixed(1))}
              {slider("Max Tokens", settings.maxTokens, 512, 16384, 512, (v) => update({ maxTokens: v }), (v) => v.toLocaleString())}
              {slider("Top P", settings.topP, 0, 1, 0.05, (v) => update({ topP: v }), (v) => v.toFixed(2))}

              {/* Judge section */}
              <div className="border-t pt-3" style={sectionBorder} />
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={lblStyle}>Judge Mode</Label>
                <div className="flex gap-1">
                  {(["off", "post_debate", "per_round"] as const).map((m) => (
                    <ToggleBtn key={m} label={m === "off" ? "OFF" : m === "post_debate" ? "Post-debate" : "Per-round"} active={settings.judgeMode === m} onClick={() => update({ judgeMode: m })} />
                  ))}
                </div>
              </div>
              {settings.judgeMode !== "off" && (
                <>
                  <div className="space-y-1.5"><Label className="font-mono text-[11px]" style={lblStyle}>Judge Provider</Label>{providerBtns(settings.judgeProvider, (v) => update({ judgeProvider: v }))}</div>
                  {modelDropdown("Judge Model", settings.judgeModel, (v) => update({ judgeModel: v }), settings.judgeProvider)}
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[11px]" style={lblStyle}>Scoring Scale</Label>
                    <div className="flex gap-1">
                      {["1-10", "1-5", "Pass/Fail"].map((s) => (
                        <ToggleBtn key={s} label={s} active={settings.judgeScoringScale === s} onClick={() => update({ judgeScoringScale: s })} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== PROMPTS TAB ===== */}
          {tab === "prompts" && (
            <>
              {[
                { label: "Builder System Prompt", key: "builderSystemPrompt" as const, placeholder: defaults?.builder_system_prompt },
                { label: "Critic System Prompt", key: "criticSystemPrompt" as const, placeholder: defaults?.critic_system_prompt },
                ...(settings.judgeMode !== "off" ? [{ label: "Judge System Prompt", key: "judgeSystemPrompt" as const, placeholder: defaults?.judge_system_prompt }] : []),
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-[11px]" style={lblStyle}>{label}</Label>
                    <button onClick={() => update({ [key]: "" })} className="font-mono text-[10px] transition-opacity hover:opacity-70" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>reset</button>
                  </div>
                  <Textarea value={settings[key]} onChange={(e) => update({ [key]: e.target.value })} placeholder={placeholder || "Leave empty for default..."} rows={3} className="resize-none font-mono text-[11px] leading-relaxed" style={inputStyle} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={lblStyle}>Convergence Keyword</Label>
                <input type="text" value={settings.convergenceKeyword} onChange={(e) => update({ convergenceKeyword: e.target.value })} className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1" style={inputStyle} />
                <p className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>The Critic uses this word to signal the solution is ready.</p>
              </div>
            </>
          )}

          {/* ===== DEBATE TAB ===== */}
          {tab === "debate" && (
            <>
              {slider("Max Rounds", settings.maxRounds, 1, 10, 1, (v) => update({ maxRounds: v }))}
              {row("Auto-scroll during streaming", <ToggleBtn label={settings.autoScroll ? "ON" : "OFF"} active={settings.autoScroll} onClick={() => update({ autoScroll: !settings.autoScroll })} />)}
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={lblStyle}>Export Format</Label>
                <div className="flex gap-1">
                  {(["markdown", "json", "both"] as const).map((f) => (
                    <ToggleBtn key={f} label={f} active={settings.exportFormat === f} onClick={() => update({ exportFormat: f })} />
                  ))}
                </div>
              </div>

              {/* History settings */}
              <div className="border-t pt-3" style={sectionBorder} />
              {row("Auto-save debates", <ToggleBtn label={settings.autoSaveDebates ? "ON" : "OFF"} active={settings.autoSaveDebates} onClick={() => update({ autoSaveDebates: !settings.autoSaveDebates })} />)}
              {settings.autoSaveDebates && (
                <>
                  {slider("Max saved debates", settings.maxSavedDebates, 10, 100, 10, (v) => update({ maxSavedDebates: v }))}
                  {row("Save incomplete debates", <ToggleBtn label={settings.saveIncomplete ? "ON" : "OFF"} active={settings.saveIncomplete} onClick={() => update({ saveIncomplete: !settings.saveIncomplete })} />)}
                </>
              )}

              {/* Diff settings */}
              <div className="border-t pt-3" style={sectionBorder} />
              {row("Show diff buttons", <ToggleBtn label={settings.showDiffButtons ? "ON" : "OFF"} active={settings.showDiffButtons} onClick={() => update({ showDiffButtons: !settings.showDiffButtons })} />)}
              {settings.showDiffButtons && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[11px]" style={lblStyle}>Diff Style</Label>
                    <div className="flex gap-1">
                      {(["unified", "split"] as const).map((s) => (
                        <ToggleBtn key={s} label={s} active={settings.diffStyle === s} onClick={() => update({ diffStyle: s })} />
                      ))}
                    </div>
                  </div>
                  {slider("Diff context lines", settings.diffContextLines, 1, 10, 1, (v) => update({ diffContextLines: v }))}
                </>
              )}

              {/* Presets */}
              <div className="border-t pt-3" style={sectionBorder} />
              <Label className="font-mono text-[11px]" style={lblStyle}>Presets</Label>
              <div className="flex gap-2">
                <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name..." className="flex-1 rounded border px-2.5 py-1.5 font-mono text-[11px] focus:outline-none focus:ring-1" style={inputStyle} />
                <button onClick={handleSavePreset} disabled={!presetName.trim()} className="rounded border px-2.5 py-1.5 font-mono text-[11px] transition-opacity hover:opacity-80 disabled:opacity-20" style={{ borderColor: "rgba(128,128,128,0.2)", color: "var(--duo-fg)" }}>save</button>
              </div>
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <div key={p.name} className="flex items-center gap-1">
                      <button onClick={() => handleLoadPreset(p)} className="rounded border px-2 py-1 font-mono text-[10px] transition-opacity hover:opacity-80" style={{ borderColor: "rgba(128,128,128,0.2)", color: "var(--duo-fg)", opacity: 0.6 }}>{p.name}</button>
                      <button onClick={() => handleDeletePreset(p.name)} className="font-mono text-[10px] transition-opacity hover:opacity-80" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>x</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {tab === "appearance" && (
            <>
              {slider("Font Size", settings.fontSize, 11, 16, 1, (v) => update({ fontSize: v }), (v) => `${v}px`)}
              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]" style={lblStyle}>Layout Direction</Label>
                <div className="flex gap-1">
                  {(["horizontal", "vertical"] as const).map((d) => (
                    <ToggleBtn key={d} label={d === "horizontal" ? "side by side" : "stacked"} active={settings.layoutDirection === d} onClick={() => update({ layoutDirection: d })} />
                  ))}
                </div>
              </div>

              {/* Syntax highlighting */}
              <div className="border-t pt-3" style={sectionBorder} />
              {row("Syntax highlighting", <ToggleBtn label={settings.syntaxHighlighting ? "ON" : "OFF"} active={settings.syntaxHighlighting} onClick={() => update({ syntaxHighlighting: !settings.syntaxHighlighting })} />)}
              {settings.syntaxHighlighting && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-mono text-[11px]" style={lblStyle}>Highlight Theme</Label>
                    <select value={settings.highlightTheme} onChange={(e) => update({ highlightTheme: e.target.value as HighlightTheme })} className="w-full rounded border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1" style={inputStyle}>
                      {(["auto", "github-dark", "github-light", "one-dark-pro", "dracula", "nord", "min-light", "min-dark"] as const).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {row("Line numbers in code", <ToggleBtn label={settings.showLineNumbers ? "ON" : "OFF"} active={settings.showLineNumbers} onClick={() => update({ showLineNumbers: !settings.showLineNumbers })} />)}
                </>
              )}

              {/* Custom theme */}
              <div className="border-t pt-3" style={sectionBorder} />
              {row("Custom Theme Colors", <ToggleBtn label={settings.useCustomTheme ? "ON" : "OFF"} active={settings.useCustomTheme} onClick={() => update({ useCustomTheme: !settings.useCustomTheme })} />)}
              {settings.useCustomTheme && (
                <>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>BG</label>
                      <input type="color" value={settings.customBg} onChange={(e) => update({ customBg: e.target.value })} className="h-7 w-10 cursor-pointer rounded border-0" />
                      <span className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>{settings.customBg}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.4 }}>FG</label>
                      <input type="color" value={settings.customFg} onChange={(e) => update({ customFg: e.target.value })} className="h-7 w-10 cursor-pointer rounded border-0" />
                      <span className="font-mono text-[10px]" style={{ color: "var(--duo-fg)", opacity: 0.3 }}>{settings.customFg}</span>
                    </div>
                  </div>
                  <div className="flex h-10 items-center justify-center rounded font-mono text-xs" style={{ backgroundColor: settings.customBg, color: settings.customFg, border: `1px solid ${settings.customFg}40` }}>
                    Preview: DueLLM
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <Button onClick={handleSave} className="font-mono text-xs" style={{ background: "var(--duo-fg)", color: "var(--duo-bg)" }}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
