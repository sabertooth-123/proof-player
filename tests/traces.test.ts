// Run: npm test
// Every committed trace must be what the extractor would produce from Lean's raw output:
// a hand-edited goal, or a stale trace after a parser change, fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { ProofStep, ProofTrace } from "../src/types/proof";
import { guessViz, instrument, parseGoals, theoremName } from "../scripts/extract-traces.mjs";

const dir = new URL("../src/data/traces/", import.meta.url);
const traces: ProofTrace[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "mock.json")
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

for (const t of traces) {
  test(`${t.id}: every step keeps Lean's raw output, and goals are parsed from it`, () => {
    t.steps.forEach((step, k) => {
      assert.equal(typeof step.raw, "string", `${t.id} step ${k}: raw missing, rerun npm run traces`);
      assert.deepEqual(step.goals, parseGoals(step.raw), `${t.id} step ${k}`);
    });
  });

  test(`${t.id}: source lines match the steps`, () => {
    const lines = t.source.split("\n");
    t.steps.forEach((step, k) => assert.ok(lines[step.line - 1].trim().includes(step.tactic), `${t.id} step ${k}`));
  });
}

// Placement rules that uploaded files rely on. No Lean needed: this checks the text we hand to Lean.
test("one-line `| case => tac` gets two traces on its own line, not a line between alternatives", () => {
  const { text, steps } = instrument("theorem t (n : Nat) : n + 0 = n := by\n  induction n with\n  | zero => rfl\n  | succ k ih => rfl\n");
  const lines = text.split("\n");
  assert.equal(lines[2], "  induction n with"); // no trace between `with` and its first alternative
  assert.equal(lines[3], "  | zero => trace_state; rfl; trace_state");
  assert.equal(lines[4], "  | succ k ih => trace_state; rfl; trace_state");
  assert.deepEqual(
    steps.map((s: { tactic: string; slot: number }) => `${s.tactic}#${s.slot}`),
    ["theorem t (n : Nat) : n + 0 = n := by#0", "| zero =>#0", "rfl#1", "| succ k ih =>#0", "rfl#1"],
  );
});

test("one-line bullets trace after the bullet; bullets with a body trace inside it", () => {
  const { text } = instrument("theorem t : (1 = 1 ∧ 2 = 2) ∧ 3 = 3 := by\n  constructor\n  · constructor\n    · rfl\n    · rfl\n  · rfl\n");
  assert.deepEqual(text.split("\n").slice(4), [
    "  · constructor", "    trace_state",
    "    · rfl", "    trace_state",
    "    · rfl", "    trace_state",
    "  · rfl", "  trace_state", "",
  ]);
});

test("unsupported layouts are rejected with a clear message", () => {
  assert.throws(() => instrument("def x := 3\n"), /no line ending in `by`/);
  assert.throws(() => instrument("theorem a : 1 = 1 := by\n  rfl\ntheorem b : 2 = 2 := by\n  rfl\n"), /one theorem per sample file/);
  assert.throws(() => instrument("theorem a : 1 = 1 := by\n  exact\n    rfl\n"), /multi-line tactics/);
});

test("guessViz and theoremName pick sensible defaults for uploads", () => {
  const step = (target: string, hyps: string[] = []): ProofStep => ({
    index: 0, line: 1, tactic: "", explanation: "",
    goals: [{ hypotheses: hyps.map((type) => ({ names: ["h"], type })), target }],
  });
  assert.equal(guessViz([step("Reach E 1 6", ["(1, 2) ∈ E"])]), "graph");
  assert.equal(guessViz([step("[1, 2] ++ [3] = [1, 2, 3]")]), "list");
  assert.equal(guessViz([step("([] ++ []).length = [].length")]), "goal"); // empty lists aren't a picture
  assert.equal(guessViz([step("n + 0 = n")]), "goal");
  assert.equal(theoremName("theorem add_zero_demo (n : Nat) : n + 0 = n := by"), "add_zero_demo");
  assert.equal(theoremName("example : 1 = 1 := by"), "example");
});
