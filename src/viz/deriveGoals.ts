import type { DeriveViz, Goal } from "../types/proof";

const name = (g: Goal, i: number, n: number) =>
  g.caseName ?? (n === 1 ? "main goal" : `goal ${i + 1}`);

/** One chip per remaining goal. A chip is "changed" if it was not there before.
 *  When the goal list becomes empty, the goal that was just closed stays visible
 *  with a check mark (taken from `previous`, so still a pure function of goals). */
export const deriveGoals: DeriveViz = (current, previous) => {
  if (current.length === 0) {
    return {
      items: (previous ?? []).map((g, i) => {
        const label = name(g, i, previous!.length);
        return { id: `goal:${label}`, label: `${label} ✓`, changed: true };
      }),
    };
  }
  const prevNames = new Set((previous ?? []).map((g, i) => name(g, i, previous!.length)));
  return {
    items: current.map((g, i) => {
      const label = name(g, i, current.length);
      return { id: `goal:${label}`, label, changed: previous !== null && !prevNames.has(label) };
    }),
  };
};
