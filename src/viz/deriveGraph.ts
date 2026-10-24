import type { DeriveViz, Goal } from "../types/proof";

// Numeric pairs like (1, 2) anywhere in the focused goal's hypotheses or target.
const PAIR = /\(\s*(\d+)\s*,\s*(\d+)\s*\)/g;

interface RawEdge { from: string; to: string; key: string; proved: boolean }

/** `proved` = the pair appears in a hypothesis (a fact we already have),
 *  not only in the target (still to be shown). */
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

/** An edge is "new" if it was not in the previous goal at all, or it just
 *  moved from the target into a hypothesis (i.e. it was just proved). */
export const deriveGraph: DeriveViz = (current, previous) => {
  const closed = current.length === 0;
  const edges = edgesOf(closed ? previous ?? [] : current);
  const prev = !closed && previous ? new Map(edgesOf(previous).map((e) => [e.key, e])) : null;
  const ids: string[] = [];
  for (const e of edges) for (const n of [e.from, e.to]) if (!ids.includes(n)) ids.push(n);
  return {
    nodes: ids.map((id) => ({ id, label: id })),
    edges: edges.map((e) => {
      const before = prev?.get(e.key);
      return { from: e.from, to: e.to, isNew: prev !== null && (!before || (e.proved && !before.proved)) };
    }),
  };
};
