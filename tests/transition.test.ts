// Run: npm test
// The state-transition engine (src/lib/transition.ts): what it may and may not claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Goal, ProofTrace } from "../src/types/proof";
import { compareStates, isAdded, traceTransitions } from "../src/lib/transition";

const g = (target: string, hyps: [string[], string][] = [], caseName?: string): Goal => ({
  ...(caseName ? { caseName } : {}),
  hypotheses: hyps.map(([names, type]) => ({ names, type })),
  target,
});
const real = (id: string): ProofTrace =>
  JSON.parse(readFileSync(new URL(`../src/data/traces/${id}.json`, import.meta.url), "utf8"));

test("first step is a start, with no claimed changes", () => {
  const t = compareStates(null, [g("p")]);
  assert.equal(t.kind, "start");
  assert.deepEqual([t.created, t.closed, t.hidden], [[], [], []]);
  assert.match(t.summary[0], /Starting state: 1 goal/);
});

test("hypotheses are compared one name at a time, so regrouping isn't a change", () => {
  const before = [g("t", [[["xs", "ys"], "List Nat"]])];
  const after = [g("t", [[["ys"], "List Nat"], [["h"], "ys = []"]])];
  const t = compareStates(before, after);
  assert.deepEqual(t.hypothesesAdded, [{ names: ["h"], type: "ys = []" }]);
  assert.deepEqual(t.hypothesesRemoved, [{ names: ["xs"], type: "List Nat" }]);
  assert.equal(t.targetChanged, false);
  assert.ok(isAdded({ names: ["h"], type: "ys = []" }, t.hypothesesAdded));
  assert.ok(!isAdded({ names: ["ys"], type: "List Nat" }, t.hypothesesAdded));
});

test("one goal splitting into tagged goals is a split", () => {
  const t = compareStates([g("a ∧ b")], [g("a", [], "left"), g("b", [], "right")]);
  assert.equal(t.kind, "split");
  assert.deepEqual(t.created, ["left", "right"]);
  assert.match(t.summary.join(" "), /Split main goal into 2 goals: left, right/);
});

test("a nested tag is a child of its parent; siblings hidden by focus are not called closed", () => {
  const t = compareStates(
    [g("a ∧ b", [], "left"), g("c", [], "right")],
    [g("a", [], "left.left"), g("b", [], "left.right")],
  );
  assert.equal(t.kind, "split");
  assert.deepEqual(t.closed, []);
  assert.deepEqual(t.hidden, ["right"]);
  assert.match(t.summary.join(" "), /right still open/);
});

test("a goal that vanishes while nothing else changes is closed", () => {
  const t = compareStates([g("a", [], "left"), g("b", [], "right")], [g("b", [], "right")]);
  assert.equal(t.kind, "close");
  assert.deepEqual(t.closed, ["left"]);
  assert.deepEqual(t.hidden, []);
});

test("an empty goal list is 'complete' only on the last step", () => {
  assert.equal(compareStates([g("a", [], "nil")], [], { isLast: false }).kind, "close");
  assert.equal(compareStates([g("a", [], "nil")], [], { isLast: false }).complete, false);
  const last = compareStates([g("a", [], "cons")], [], { isLast: true });
  assert.equal(last.kind, "complete");
  assert.match(last.summary.join(" "), /proof complete/);
});

test("several untagged goals that can't be matched make no per-goal claims", () => {
  const t = compareStates([g("a"), g("b")], [g("c"), g("d"), g("e")]);
  assert.equal(t.certain, false);
  assert.equal(t.kind, "restructure");
  assert.deepEqual([t.created, t.closed, t.hypothesesAdded], [[], [], []]);
  assert.match(t.summary[0], /Goal structure changed: 2 goals before, 3 goals now/);
});

test("the main goal gaining a case tag is focusing on that case", () => {
  const t = compareStates([g("P n")], [g("P 0", [], "zero")]);
  assert.equal(t.kind, "focus");
  assert.match(t.summary.join(" "), /Working on case zero/);
});

test("nothing changed is reported as unchanged", () => {
  const t = compareStates([g("a", [[["h"], "b"]])], [g("a", [[["h"], "b"]])]);
  assert.equal(t.kind, "same");
  assert.match(t.summary.join(" "), /unchanged/);
});

test("built-in proofs: transitions match what Lean's states show", () => {
  const kinds = (id: string) => traceTransitions(real(id).steps).map((t) => t.kind).join(" ");
  assert.equal(kinds("and_split"), "start split close complete");
  assert.equal(kinds("len_append"), "start focus close change change complete");
  assert.equal(kinds("list_demo"), "start change change change change change complete");
  assert.equal(kinds("graph_path"), "start change change change change change change complete");
  const graph = traceTransitions(real("graph_path").steps);
  assert.deepEqual(graph[1].hypothesesAdded, [{ names: ["h12"], type: "(1, 2) ∈ E" }]);
  assert.equal(graph[2].targetChanged, true);
});

test("every transition of every trace has a summary and never claims completion early", () => {
  const ids = (JSON.parse(readFileSync(new URL("../samples/index.json", import.meta.url), "utf8")) as { id: string }[]).map((m) => m.id);
  for (const id of ids) {
    const ts = traceTransitions(real(id).steps);
    ts.forEach((t, i) => {
      assert.ok(t.summary.length > 0, `${id} step ${i}`);
      assert.equal(t.complete, i === ts.length - 1, `${id} step ${i}`);
    });
  }
});
