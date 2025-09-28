import { useEffect } from "react";

type Hotkey = {
  combo: string;
  handler: (event: KeyboardEvent) => void;
};

export const normalize = (combo: string) => {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const mods: string[] = [];
  const keys: string[] = [];
  parts.forEach((p) => {
    if (["mod", "ctrl", "meta", "shift", "alt"].includes(p)) mods.push(p === "ctrl" || p === "meta" ? "mod" : p);
    else keys.push(p);
  });
  mods.sort();
  keys.sort();
  return [...mods, ...keys].join("+");
};

export const matchEventCombo = (event: KeyboardEvent) => {
  const keys: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    keys.push("mod");
  }
  if (event.shiftKey) {
    keys.push("shift");
  }
  if (event.altKey) {
    keys.push("alt");
  }
  const key = event.key.toLowerCase();
  if (!["control", "shift", "alt", "meta"].includes(key)) {
    keys.push(key);
  }
  const mods = keys.filter((k) => ["mod", "shift", "alt"].includes(k)).sort();
  const others = keys.filter((k) => !["mod", "shift", "alt"].includes(k)).sort();
  return [...mods, ...others].join("+");
};

export const useHotkeys = (hotkeys: Hotkey[]) => {
  useEffect(() => {
    if (hotkeys.length === 0) {
      return () => undefined;
    }

    const normalized = hotkeys.map(({ combo, handler }) => ({
      combo: normalize(combo),
      handler
    }));

    const listener = (event: KeyboardEvent) => {
      const eventCombo = matchEventCombo(event);
      const entry = normalized.find((item) => item.combo === eventCombo);
      if (entry) {
        event.preventDefault();
        entry.handler(event);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [hotkeys]);
};
