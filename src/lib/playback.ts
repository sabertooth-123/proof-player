// Pure playback rules shared by the player hook and the controls, so they can be tested
// without a browser. The selected step index is the only playback state; everything on
// screen (source line, goals, picture, explanation) is read from that one index.

/** Keeps a step index inside a trace of `count` steps. */
export const clampStep = (index: number, count: number) => Math.min(Math.max(0, index), Math.max(0, count - 1));

/** Autoplay runs only while there is a next step to go to. */
export const isAutoplaying = (wantsToPlay: boolean, index: number, count: number) => wantsToPlay && index < count - 1;

export type KeyAction = "prev" | "next" | "toggle" | "first" | "last";

export interface KeyInfo {
  key: string;
  code: string;
  tagName?: string; // of the focused element
  isContentEditable?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

/**
 * Which playback action a key press means, or null to leave it alone: never while
 * typing in a field or choosing from a dropdown, never with a modifier (browser shortcuts).
 * Focused buttons are fine: after a mouse click the button keeps focus.
 */
export function keyAction(e: KeyInfo): KeyAction | null {
  if (e.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName ?? "")) return null;
  if (e.altKey || e.ctrlKey || e.metaKey) return null;
  if (e.code === "Space") return "toggle";
  if (e.key === "ArrowLeft") return "prev";
  if (e.key === "ArrowRight") return "next";
  if (e.key === "Home") return "first";
  if (e.key === "End") return "last";
  return null;
}
