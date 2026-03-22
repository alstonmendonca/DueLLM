"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/lib/types";

const STORAGE_KEY = "duellm-settings";

const DEFAULT_SETTINGS: Settings = {
  builderModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  criticModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
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

  useEffect(() => {
    if (open) setSettings(loadSettings());
  }, [open]);

  const handleSave = () => {
    saveSettings(settings);
    onSave(settings);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-[#F0EDE5]/15 bg-[#312F2C] text-[#F0EDE5] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-bold tracking-wide text-[#F0EDE5]">
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <div className="space-y-2">
            <Label className="font-mono text-[11px] text-[#F0EDE5]/40">
              Builder Model
            </Label>
            <Input
              value={settings.builderModel}
              onChange={(e) =>
                setSettings({ ...settings, builderModel: e.target.value })
              }
              className="border-[#F0EDE5]/10 bg-[#312F2C] font-mono text-sm text-[#F0EDE5]/70 focus-visible:ring-[#F0EDE5]/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-[11px] text-[#F0EDE5]/40">
              Critic Model
            </Label>
            <Input
              value={settings.criticModel}
              onChange={(e) =>
                setSettings({ ...settings, criticModel: e.target.value })
              }
              className="border-[#F0EDE5]/10 bg-[#312F2C] font-mono text-sm text-[#F0EDE5]/70 focus-visible:ring-[#F0EDE5]/20"
            />
          </div>
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
