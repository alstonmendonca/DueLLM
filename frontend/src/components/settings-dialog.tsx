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
    if (open) {
      setSettings(loadSettings());
    }
  }, [open]);

  const handleSave = () => {
    saveSettings(settings);
    onSave(settings);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-neutral-800 bg-neutral-950 text-neutral-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-neutral-200">Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-2">
            <Label className="text-neutral-400">Builder Model</Label>
            <Input
              value={settings.builderModel}
              onChange={(e) =>
                setSettings({ ...settings, builderModel: e.target.value })
              }
              className="border-neutral-800 bg-black font-mono text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-neutral-400">Critic Model</Label>
            <Input
              value={settings.criticModel}
              onChange={(e) =>
                setSettings({ ...settings, criticModel: e.target.value })
              }
              className="border-neutral-800 bg-black font-mono text-sm text-neutral-300"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-neutral-400">
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
              className="w-full accent-neutral-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-neutral-400">
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
              className="w-full accent-neutral-500"
            />
          </div>
          <Button
            onClick={handleSave}
            className="bg-white text-black hover:bg-neutral-200"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
