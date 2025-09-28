import { useEffect } from "react";

type Hotkey = {
  combo: string;
  handler: (event: KeyboardEvent) => void;
};

const normalize = (combo: string) =>
  combo
    .toLowerCase()
    .split("+")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .sort()
    .join("+");

const matchEventCombo = (event: KeyboardEvent) => {
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
  return keys.sort().join("+");
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
