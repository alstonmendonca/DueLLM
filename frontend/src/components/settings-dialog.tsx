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
import { getModels } from "@/lib/api";
import type { Settings, BedrockModel } from "@/lib/types";

const STORAGE_KEY = "duellm-settings";

const DEFAULT_SETTINGS: Settings = {
  builderModel: "us.anthropic.claude-sonnet-4-6",
  criticModel: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  maxRounds: 5,
  temperature: 0.7,
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

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setLoadingModels(true);
      getModels()
        .then(setModels)
        .catch(() => setModels([]))
        .finally(() => setLoadingModels(false));
    }
  }, [open]);

  const handleSave = () => {
    saveSettings(settings);
    onSave(settings);
    onClose();
  };

  const modelSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <div className="space-y-2">
      <Label className="font-mono text-[11px] text-[#F0EDE5]/40">
        {label}
      </Label>
      {loadingModels ? (
        <div className="rounded border border-[#F0EDE5]/10 px-3 py-2 font-mono text-xs text-[#F0EDE5]/30">
          Loading models...
        </div>
      ) : models.length > 0 ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-[#F0EDE5]/10 bg-[#312F2C] px-3 py-2 font-mono text-xs text-[#F0EDE5]/70 focus:outline-none focus:ring-1 focus:ring-[#F0EDE5]/20"
        >
          {models.map((m) => (
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
          placeholder="e.g. anthropic.claude-sonnet-4-6"
          className="w-full rounded border border-[#F0EDE5]/10 bg-[#312F2C] px-3 py-2 font-mono text-xs text-[#F0EDE5]/70 placeholder:text-[#F0EDE5]/20 focus:outline-none focus:ring-1 focus:ring-[#F0EDE5]/20"
        />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-[#F0EDE5]/15 bg-[#312F2C] text-[#F0EDE5] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-bold tracking-wide text-[#F0EDE5]">
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          {modelSelect(
            "Builder Model (LLM A)",
            settings.builderModel,
            (v) => setSettings({ ...settings, builderModel: v })
          )}
          {modelSelect(
            "Critic Model (LLM B)",
            settings.criticModel,
            (v) => setSettings({ ...settings, criticModel: v })
          )}
          <div className="space-y-2">
            <Label className="font-mono text-[11px] text-[#F0EDE5]/40">
              Max Rounds ({settings.maxRounds})
            </Label>
            <input
              type="range"
              min={1}
              max={10}
              value={settings.maxRounds}
              onChange={(e) =>
                setSettings({ ...settings, maxRounds: parseInt(e.target.value) })
              }
              className="w-full accent-[#F0EDE5]"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-[11px] text-[#F0EDE5]/40">
              Temperature ({settings.temperature.toFixed(1)})
            </Label>
            <input
              type="range"
              min={0}
              max={10}
              value={settings.temperature * 10}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  temperature: parseInt(e.target.value) / 10,
                })
              }
              className="w-full accent-[#F0EDE5]"
            />
          </div>
          <Button
            onClick={handleSave}
            className="bg-[#F0EDE5] font-mono text-xs text-[#312F2C] hover:bg-[#F0EDE5]/90"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
