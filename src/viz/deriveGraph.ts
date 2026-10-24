import type { DeriveViz, Goal } from "../types/proof";

// Numeric pairs like (1, 2) anywhere in the focused goal's hypotheses or target.
const PAIR = /\(\s*(\d+)\s*,\s*(\d+)\s*\)/g;
// "Reach E 2 6": the last two numbers are where we stand now (2) and where we are going (6).
const CURRENT = /(\d+)\s+(\d+)\s*$/;

interface RawEdge { from: string; to: string; key: string; proved: boolean }

/** `proved` = the pair appears in a hypothesis (a fact we already have),
 *  not only in the target. Order is the order Lean lists them, so hypotheses
 *  come first, oldest to newest. */
function edgesOf(goals: Goal[]): RawEdge[] {
  const goal = goals[0];
  if (!goal) return [];
  const out = new Map<string, RawEdge>();
  const scan = (text: string, proved: boolean) => {
    for (const m of text.matchAll(PAIR)) {
      const key = `${m[1]}->${m[2]}`;
      const old = out.get(key);
      if (!old) out.set(key, { from: m[1], to: m[2], key, proved });
      else if (proved) old.proved = true;
    }
  };
  goal.hypotheses.forEach((h) => scan(h.type, true));
  scan(goal.target, false);
  return [...out.values()];
}

function currentNode(goals: Goal[]): string | null {
  return goals[0]?.target.match(CURRENT)?.[1] ?? null;
}

/** Graph = every edge Lean has proved so far (hypotheses like `(1, 2) ∈ E`).
 *  - the NEWEST edge (the last proved one) is flagged `isNew`
 *  - the CURRENT node is the first number of the target, e.g. 2 in `Reach E 2 6`
 *  When all goals are closed we keep drawing the last picture (from `previous`). */
export const deriveGraph: DeriveViz = (current, previous) => {
  const base = current.length > 0 ? current : previous ?? [];
  const edges = edgesOf(base);
  const newest = [...edges].reverse().find((e) => e.proved)?.key ?? null;
  const here = currentNode(base);

  const ids: string[] = [];
  for (const e of edges) for (const n of [e.from, e.to]) if (!ids.includes(n)) ids.push(n);
  if (here !== null && !ids.includes(here)) ids.push(here);

  return {
    nodes: ids.map((id) => ({ id, label: id, current: id === here })),
    edges: edges.map((e) => ({ from: e.from, to: e.to, isNew: e.key === newest })),
  };
};
