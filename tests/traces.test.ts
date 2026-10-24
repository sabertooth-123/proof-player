// Run: npm test
// Every committed trace must be what the extractor would produce from Lean's raw output:
// a hand-edited goal, or a stale trace after a parser change, fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { ProofTrace } from "../src/types/proof";
// @ts-expect-error plain .mjs script without type declarations
import { parseGoals } from "../scripts/extract-traces.mjs";

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
    t.steps.forEach((step, k) => assert.equal(lines[step.line - 1].trim(), step.tactic, `${t.id} step ${k}`));
  });
}
