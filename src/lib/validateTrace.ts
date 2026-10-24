import type { ProofTrace, VizKind } from "../types/proof";

// Checks that data claiming to be a ProofTrace has the shape the player relies on.
// Used on traces coming from the Lean server (and in tests on the committed ones),
// so a malformed answer becomes a clear error instead of a broken panel.

const VIZ: VizKind[] = ["list", "graph", "goal"];
const isStr = (v: unknown): v is string => typeof v === "string";

/** Returns a list of problems; empty means the trace is usable. */
export function traceProblems(value: unknown): string[] {
  const problems: string[] = [];
  const t = value as Partial<ProofTrace> | null;
  if (!t || typeof t !== "object") return ["not an object"];
  if (!isStr(t.id) || !t.id) problems.push("missing id");
  if (!isStr(t.title)) problems.push("missing title");
  if (!isStr(t.source)) problems.push("missing source");
  if (!VIZ.includes(t.viz as VizKind)) problems.push(`unknown viz "${String(t.viz)}"`);
  if (!t.provenance || !isStr(t.provenance.lean)) problems.push("missing Lean version");
  if (!Array.isArray(t.steps) || t.steps.length === 0) return [...problems, "no steps"];

  const lines = isStr(t.source) ? t.source.split("\n").length : 0;
  t.steps.forEach((s, i) => {
    const at = `step ${i + 1}`;
    if (!s || typeof s !== "object") return problems.push(`${at}: not an object`);
    if (s.index !== i) problems.push(`${at}: index ${String(s.index)}`);
    if (!Number.isInteger(s.line) || s.line < 1 || (lines && s.line > lines)) problems.push(`${at}: line ${String(s.line)} outside the source`);
    if (!isStr(s.tactic)) problems.push(`${at}: missing tactic`);
    if (!isStr(s.explanation)) problems.push(`${at}: missing explanation`);
    if (s.raw !== undefined && !isStr(s.raw)) problems.push(`${at}: raw output is not text`);
    if (!Array.isArray(s.goals)) return problems.push(`${at}: goals is not a list`);
    s.goals.forEach((g, j) => {
      if (!g || !isStr(g.target)) problems.push(`${at}, goal ${j + 1}: missing target`);
      if (g?.caseName !== undefined && !isStr(g.caseName)) problems.push(`${at}, goal ${j + 1}: bad case name`);
      if (!Array.isArray(g?.hypotheses) || !g.hypotheses.every((h) => Array.isArray(h?.names) && h.names.every(isStr) && isStr(h?.type))) {
        problems.push(`${at}, goal ${j + 1}: bad hypotheses`);
      }
    });
  });
  return problems;
}

/** Throws a readable Error if `value` isn't a usable ProofTrace. */
export function assertTrace(value: unknown): ProofTrace {
  const problems = traceProblems(value);
  if (problems.length) {
    const shown = problems.slice(0, 3).join("; ") + (problems.length > 3 ? `; and ${problems.length - 3} more` : "");
    throw new Error(`the Lean server sent a trace Proof Player can't use (${shown})`);
  }
  return value as ProofTrace;
}
