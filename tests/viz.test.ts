// Run: npx tsx --test tests/viz.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveList } from "../src/viz/deriveList";
import { deriveGraph } from "../src/viz/deriveGraph";
import { deriveGoals } from "../src/viz/deriveGoals";
import { findListLiterals, splitSides } from "../src/viz/leanText";
import { mockGoal, mockGraph, mockList } from "../src/dev/mockGoals";

test("findListLiterals handles nesting and empties", () => {
  assert.deepEqual(findListLiterals("[3, 1, 2].reverse ++ [4]"), [["3", "1", "2"], ["4"]]);
  assert.deepEqual(findListLiterals("xs ++ []"), [[]]);
  assert.deepEqual(findListLiterals("[(1, 2), (2, 3)]"), [["(1, 2)", "(2, 3)"]]);
});

test("splitSides ignores <=, := and bracketed =", () => {
  assert.deepEqual(splitSides("a ≤ b"), ["a ≤ b", null]);
  assert.deepEqual(splitSides("f (x = 1) = y"), ["f (x = 1)", "y"]);
  assert.deepEqual(splitSides("[1].reverse = [1]"), ["[1].reverse", "[1]"]);
});

test("list: first step has nothing highlighted, rewrite step highlights moved boxes", () => {
  const f0 = deriveList(mockList[0], null);
  assert.ok(f0.items!.every((i) => !i.changed));
  assert.deepEqual(f0.items!.filter((i) => i.id.startsWith("L:")).map((i) => i.label), ["3", "1", "2"]);
  const f1 = deriveList(mockList[1], mockList[0]);
  assert.deepEqual(f1.items!.filter((i) => i.id.startsWith("L:")).map((i) => i.label), ["1", "2", "3"]);
  assert.ok(f1.items!.some((i) => i.changed));
  assert.ok(f1.items!.filter((i) => i.id.startsWith("R:")).every((i) => !i.changed)); // RHS untouched
});

test("list: closed goals keep the last picture, nothing highlighted", () => {
  const f = deriveList([], mockList[3]);
  assert.equal(f.items!.length, 6);
  assert.ok(f.items!.every((i) => !i.changed));
});

test("goal chips: nil/cons appear, then shrink", () => {
  assert.deepEqual(deriveGoals(mockGoal[1], mockGoal[0]).items!.map((i) => [i.label, i.changed]), [["nil", true], ["cons", true]]);
  assert.deepEqual(deriveGoals(mockGoal[2], mockGoal[1]).items!.map((i) => [i.label, i.changed]), [["cons", false]]);
  assert.deepEqual(deriveGoals([], mockGoal[2]).items!.map((i) => i.label), ["cons ✓"]);
});

test("graph: newest proved edge is flagged, current node is the first number of the target", () => {
  const f0 = deriveGraph(mockGraph[0], null);
  assert.deepEqual(f0.edges, []);
  assert.deepEqual(f0.nodes, [{ id: "1", label: "1", current: true }]);
  const f1 = deriveGraph(mockGraph[1], mockGraph[0]);
  assert.deepEqual(f1.edges!.map((e) => `${e.from}>${e.to}:${e.isNew}`), ["1>2:true"]);
  assert.deepEqual(f1.nodes!.filter((n) => n.current).map((n) => n.id), ["2"]);
  const f2 = deriveGraph(mockGraph[2], mockGraph[1]);
  assert.deepEqual(f2.edges!.map((e) => `${e.from}>${e.to}:${e.isNew}`), ["1>2:false", "2>5:true"]);
  assert.deepEqual(f2.nodes!.filter((n) => n.current).map((n) => n.id), ["5"]);
});

test("derivers are pure: same input, same output", () => {
  for (const fn of [deriveList, deriveGraph, deriveGoals]) {
    assert.deepEqual(fn(mockList[1], mockList[0]), fn(mockList[1], mockList[0]));
  }
});

// --- Real Lean output (src/data/traces/*.json) -------------------------------
import { readFileSync } from "node:fs";
import type { ProofTrace } from "../src/types/proof";
const real = (id: string): ProofTrace =>
  JSON.parse(readFileSync(new URL(`../src/data/traces/${id}.json`, import.meta.url), "utf8"));

test("real len_append: main goal -> nil -> nil closed -> cons -> cons closed", () => {
  const t = real("len_append");
  const labels = t.steps.map((s, k) =>
    deriveGoals(s.goals, k ? t.steps[k - 1].goals : null).items!.map((i) => i.label).join(","));
  assert.deepEqual(labels, ["main goal", "nil", "nil ✓", "cons", "cons", "cons ✓"]);
});

test("real graph_path: path grows 1>2, 2>5, 5>6; current node walks 1,1,2,2,5,5,6,6", () => {
  const t = real("graph_path");
  const frames = t.steps.map((s, k) => deriveGraph(s.goals, k ? t.steps[k - 1].goals : null));
  const edgeList = (k: number) => frames[k].edges!.map((e) => `${e.from}>${e.to}${e.isNew ? "*" : ""}`).join(" ");
  assert.deepEqual(frames.map((_, k) => edgeList(k)), [
    "", "1>2*", "1>2*", "1>2 2>5*", "1>2 2>5*", "1>2 2>5 5>6*", "1>2 2>5 5>6*", "1>2 2>5 5>6*",
  ]);
  assert.deepEqual(
    frames.map((f) => f.nodes!.find((n) => n.current)?.id),
    ["1", "1", "2", "2", "5", "5", "6", "6"],
  );
});

test("real list_demo: boxes rearrange step by step and the right side never changes", () => {
  const t = real("list_demo");
  const side = (k: number, p: string) =>
    deriveList(t.steps[k].goals, k ? t.steps[k - 1].goals : null)
      .items!.filter((i) => i.id.startsWith(p)).map((i) => i.label).join("");
  assert.deepEqual(t.steps.map((_, k) => side(k, "L:")), ["12345", "23451", "34521", "45321", "54321", "54321", "54321"]);
  assert.ok(t.steps.every((_, k) => side(k, "R:") === "54321"));
});
