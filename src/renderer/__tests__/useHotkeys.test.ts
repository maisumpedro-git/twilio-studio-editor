/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { normalize, matchEventCombo } from "../hooks/useHotkeys";

describe("useHotkeys helpers", () => {
  it("normalizes combos and matches events", () => {
    expect(normalize("Shift+Mod+S")).toBe("mod+shift+s");
    const evt = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, shiftKey: true });
    expect(matchEventCombo(evt)).toBe("mod+shift+s");
  });
});
