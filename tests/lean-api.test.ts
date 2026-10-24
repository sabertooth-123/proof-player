// Run: npm test
// What the public Lean server accepts. No Lean needed: these checks run before Lean does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkPublicUpload } from "../scripts/lean-api.mjs";

const proof = "theorem t : 1 = 1 := by\n  rfl\n";

test("every committed sample is accepted by the public server", () => {
  const ids = (JSON.parse(readFileSync(new URL("../samples/index.json", import.meta.url), "utf8")) as { id: string }[]).map((m) => m.id);
  for (const id of ids) {
    assert.doesNotThrow(() => checkPublicUpload(readFileSync(new URL(`../samples/${id}.lean`, import.meta.url), "utf8")), id);
  }
});

test("plain definitions, namespaces and comments are fine", () => {
  assert.doesNotThrow(() => checkPublicUpload("-- #eval in a comment\n/- import Lean -/\nnamespace Demo\nopen Nat\ndef two := 2\n@[simp] theorem two_eq : two = 2 := rfl\n" + proof + "end Demo\n"));
});

test("anything that could run code or raise limits is rejected", () => {
  const rejected: [string, RegExp][] = [
    ['#eval IO.println "hi"\n', /#` commands/],
    ["#print Nat\n", /#` commands/],
    ["import Lean\n", /import/],
    ["def f : IO Unit := pure ()\n", /IO/],
    ['macro "x" : tactic => `(tactic| rfl)\n', /custom syntax/],
    ["syntax \"x\" : term\n", /custom syntax/],
    ["run_cmd pure ()\n", /run_cmd/],
    ["unsafe def f : Nat := 1\n", /unsafe/],
    ["@[implemented_by f] def g : Nat := 1\n", /unsafe or native/],
    ["set_option maxHeartbeats 0\n", /resource limits/],
    ["attribute [simp] Nat.add_zero\n", /top level/],
  ];
  for (const [prefix, why] of rejected) assert.throws(() => checkPublicUpload(prefix + proof), why, prefix);
});
