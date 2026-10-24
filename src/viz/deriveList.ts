import type { DeriveViz, Goal } from "../types/proof";
import { findListLiterals, splitSides } from "./leanText";

interface RawItem { side: "L" | "R"; pos: number; label: string; id: string }

// Elements of every list literal on each side of the "=" in the focused goal.
function listItems(goals: Goal[]): RawItem[] {
  const goal = goals[0]; // Lean's first goal is the one being worked on
  if (!goal) return [];
  const [left, right] = splitSides(goal.target);
  const out: RawItem[] = [];
  for (const [side, text] of [["L", left], ["R", right]] as const) {
    const seen = new Map<string, number>();
    findListLiterals(text ?? "").flat().forEach((label, pos) => {
      const n = seen.get(label) ?? 0;
      seen.set(label, n + 1);
      out.push({ side, pos, label, id: `${side}:${label}:${n}` });
    });
  }
  return out;
}

/** ids start with "L:" (left of =) or "R:" (right of =); ListView groups by that. */
export const deriveList: DeriveViz = (current, previous) => {
  const closed = current.length === 0;
  const items = listItems(closed ? previous ?? [] : current);
  const prevSet =
    !closed && previous && previous.length > 0
      ? new Set(listItems(previous).map((i) => `${i.side}@${i.pos}=${i.label}`))
      : null;
  return {
    items: items.map((i) => ({
      id: i.id,
      label: i.label,
      changed: prevSet !== null && !prevSet.has(`${i.side}@${i.pos}=${i.label}`),
    })),
  };
};
