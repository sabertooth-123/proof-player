// Run: npm test
// "Predict the next state": what counts as the observed change, and how guesses are graded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ProofTrace } from "../src/types/proof";
import { traceTransitions } from "../src/lib/transition";
import { grade, observedChanges, type ChangeKind } from "../src/lib/predict";

const real = (id: string): ProofTrace =>
  JSON.parse(readFileSync(new URL(`../src/data/traces/${id}.json`, import.meta.url), "utf8"));
const observed = (id: string) => traceTransitions(real(id).steps).map((t) => {
  const o = observedChanges(t);
  return o === null ? "-" : [...o].sort().join("+") || "other";
});

test("observed changes on the built-in proofs match what Lean's states show", () => {
  assert.deepEqual(observed("and_split"), ["-", "split", "close", "close"]);
  assert.deepEqual(observed("graph_path"), ["-", "hypothesis", "target", "hypothesis", "target", "hypothesis", "target", "close"]);
  assert.deepEqual(observed("list_demo"), ["-", "target", "target", "target", "target", "target", "close"]);
  // `| cons x xs ih =>` brings the next case into view: none of the five options describe it.
  assert.deepEqual(observed("len_append"), ["-", "target", "close", "other", "target", "close"]);
});

test("the first step has nothing to predict", () => {
  for (const id of ["and_split", "graph_path", "len_append", "list_demo"]) {
    assert.equal(observedChanges(traceTransitions(real(id).steps)[0]), null);
  }
});

test("grading: exact, partly right, wrong, and missed changes", () => {
  const s = (...k: ChangeKind[]) => new Set(k);
  assert.deepEqual(grade(s("split"), s("split")), { exact: true, right: ["split"], wrong: [], missed: [], other: false });
  const partly = grade(s("target", "hypothesis"), s("hypothesis"));
  assert.equal(partly.exact, false);
  assert.deepEqual([partly.right, partly.wrong, partly.missed], [["hypothesis"], ["target"], []]);
  const missed = grade(s(), s("close"));
  assert.deepEqual(missed.missed, ["close"]);
  assert.equal(grade(s("unchanged"), s()).other, true);
});
