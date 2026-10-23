import type { Goal, Hypothesis } from "../types/proof";

export const hypKey = (h: Hypothesis) => `${h.names.join(" ")} : ${h.type}`;

/** Which goal in `previous` does `goal` come from? Same case name, else the
 *  single previous goal (it just split), else the one at the same position. */
export function findPrevGoal(goal: Goal, index: number, previous: Goal[] | null): Goal | null {
  if (!previous || previous.length === 0) return null;
  if (goal.caseName) {
    const same = previous.find((p) => p.caseName === goal.caseName);
    if (same) return same;
  }
  return previous.length === 1 ? previous[0] : previous[index] ?? null;
}

export interface GoalDiff {
  added: Set<string>; // hypKeys that are new
  removed: Hypothesis[]; // hypotheses that disappeared
  targetChanged: boolean;
}

export function diffGoal(goal: Goal, prev: Goal | null): GoalDiff {
  if (!prev) return { added: new Set(), removed: [], targetChanged: false };
  const before = new Set(prev.hypotheses.map(hypKey));
  const after = new Set(goal.hypotheses.map(hypKey));
  return {
    added: new Set([...after].filter((k) => !before.has(k))),
    removed: prev.hypotheses.filter((h) => !after.has(hypKey(h))),
    targetChanged: prev.target !== goal.target,
  };
}
