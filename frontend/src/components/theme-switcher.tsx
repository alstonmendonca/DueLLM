"use client";

import { useState, useEffect } from "react";

interface ColorTheme {
  name: string;
  bg: string;
  fg: string;
}

const THEMES: ColorTheme[] = [
  { name: "Ink", bg: "#312F2C", fg: "#F0EDE5" },
  { name: "Paper", bg: "#F7F4F3", fg: "#312F2C" },
  { name: "Red", bg: "#FB2333", fg: "#F7F4F3" },
  { name: "Midnight", bg: "#0a0a0a", fg: "#ffffff" },
  { name: "Cream", bg: "#F0EDE5", fg: "#FB2333" },
];

const STORAGE_KEY = "duellm-color-theme";

function applyTheme(theme: ColorTheme) {
  document.documentElement.style.setProperty("--duo-bg", theme.bg);
  document.documentElement.style.setProperty("--duo-fg", theme.fg);
}

export default function ThemeSwitcher() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < THEMES.length) {
        setActiveIdx(idx);
        applyTheme(THEMES[idx]);
      }
    }
  }, []);

  const handleSelect = (idx: number) => {
    setActiveIdx(idx);
    applyTheme(THEMES[idx]);
    localStorage.setItem(STORAGE_KEY, String(idx));
  };

  return (
    <div className="flex items-center gap-1.5">
      {THEMES.map((theme, idx) => (
        <button
          key={theme.name}
          onClick={() => handleSelect(idx)}
          title={theme.name}
          className="relative h-4 w-4 rounded-full transition-transform hover:scale-110"
          style={{
            background: theme.bg,
            border: `1.5px solid ${theme.fg}`,
            transform: activeIdx === idx ? "scale(1.2)" : undefined,
            boxShadow: activeIdx === idx ? `0 0 0 1.5px ${theme.fg}40` : undefined,
          }}
        >
          {/* Inner dot showing fg color */}
          <span
            className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: theme.fg }}
          />
        </button>
      ))}
    </div>
  );
}
