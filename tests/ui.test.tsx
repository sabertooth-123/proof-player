// Run: npm test
// Goal inspector, visualization fallback, trace validation and upload error handling.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import React from "react";
import { register } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { Goal, ProofTrace } from "../src/types/proof";

(globalThis as { React?: typeof React }).React = React;
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function load(url, ctx, next) {
         if (url.endsWith(".css")) return { format: "module", source: "export default {}", shortCircuit: true };
         return next(url, ctx);
       }`,
    ),
);
const { GoalPanel } = await import("../src/components/GoalPanel");
const { VisualizationPanel } = await import("../src/components/VisualizationPanel");
const { traceProblems, assertTrace } = await import("../src/lib/validateTrace");
const { extractLeanFile, UploadError } = await import("../src/lib/leanUpload");

const dir = new URL("../src/data/traces/", import.meta.url);
const traces: ProofTrace[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "mock.json")
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
const goal = (target: string, n = 0, caseName?: string): Goal => ({
  ...(caseName ? { caseName } : {}),
  hypotheses: Array.from({ length: n }, (_, i) => ({ names: [`h${i}`], type: `P${i}` })),
  target,
});

test("every committed trace passes validation", () => {
  for (const t of traces) assert.deepEqual(traceProblems(t), [], t.id);
});

test("malformed traces are reported, not accepted", () => {
  const good = traces[0];
  assert.ok(traceProblems(null).length > 0);
  assert.ok(traceProblems({ ...good, steps: [] }).some((p) => /no steps/.test(p)));
  assert.ok(traceProblems({ ...good, viz: "pie" }).some((p) => /unknown viz/.test(p)));
  const badStep = { ...good, steps: [{ ...good.steps[0], line: 999 }] };
  assert.ok(traceProblems(badStep).some((p) => /outside the source/.test(p)));
  const badGoal = { ...good, steps: [{ ...good.steps[0], goals: [{ hypotheses: "x" }] }] };
  assert.ok(traceProblems(badGoal).some((p) => /missing target|bad hypotheses/.test(p)));
  assert.throws(() => assertTrace({ id: "x" }), /can't use/);
});

test("goal panel: long hypothesis lists collapse, every line can be copied, current goal marked", () => {
  const html = renderToStaticMarkup(<GoalPanel goals={[goal("A", 10, "left"), goal("B", 0, "right")]} previous={null} />);
  assert.ok(html.includes("Show 4 earlier hypotheses"));
  assert.ok(html.includes("h9") && !html.includes(">h0<"), "newest hypotheses shown first");
  assert.ok(html.includes('aria-label="Copy target"'));
  assert.ok(html.includes("pp-goal-current"));
  assert.equal(html.split("pp-goal-current").length - 1, 1);
});

test("goal panel: hypotheses new since the previous state are highlighted", () => {
  const html = renderToStaticMarkup(<GoalPanel goals={[goal("A", 2)]} previous={[goal("A", 1)]} />);
  assert.equal(html.split('class="pp-new"').length - 1, 1);
});

test("goal panel: an empty state says closed or complete, never crashes", () => {
  assert.ok(renderToStaticMarkup(<GoalPanel goals={[]} previous={[goal("A")]} />).includes("Goal closed"));
  assert.ok(renderToStaticMarkup(<GoalPanel goals={[]} previous={[goal("A")]} isFinal />).includes("Proof complete"));
  assert.ok(renderToStaticMarkup(<GoalPanel goals={[]} previous={null} />).includes("Goal closed"));
});

test("visualization: a state without the needed structure falls back to open goals, with a note", () => {
  const list = renderToStaticMarkup(<VisualizationPanel kind="list" goals={[goal("n + 0 = n")]} previous={null} />);
  assert.ok(list.includes("Showing open goals") && list.includes("pp-chip"));
  const graph = renderToStaticMarkup(<VisualizationPanel kind="graph" goals={[goal("x = y")]} previous={null} />);
  assert.ok(graph.includes("Showing open goals"));
  const real = renderToStaticMarkup(<VisualizationPanel kind="list" goals={[goal("[1, 2].reverse = [2, 1]")]} previous={null} />);
  assert.ok(!real.includes("Showing open goals") && real.includes("pp-box"));
});

test("visualization: the same goals always give the same picture (no step numbers involved)", () => {
  const t = traces.find((x) => x.id === "graph_path")!;
  const a = renderToStaticMarkup(<VisualizationPanel kind="graph" goals={t.steps[4].goals} previous={t.steps[3].goals} />);
  const b = renderToStaticMarkup(<VisualizationPanel kind="graph" goals={t.steps[4].goals} previous={t.steps[3].goals} />);
  assert.equal(a, b);
});

// Upload errors: a fake fetch stands in for the Lean server.
const lean = new File(["theorem t : 1 = 1 := by\n  rfl\n"], "t.lean");
const withFetch = async (impl: () => Promise<Response>, run: () => Promise<void>) => {
  const real = globalThis.fetch;
  globalThis.fetch = impl as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = real;
  }
};
const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const failsWith = async (kind: string, file = lean) => {
  try {
    await extractLeanFile(file);
    assert.fail("expected an UploadError");
  } catch (e) {
    assert.ok(e instanceof UploadError, String(e));
    assert.equal((e as InstanceType<typeof UploadError>).kind, kind);
    return e as InstanceType<typeof UploadError>;
  }
};

test("upload: each kind of failure is told apart, and the source is kept for the error card", async () => {
  await failsWith("not-lean", new File(["x"], "notes.txt"));
  await withFetch(() => Promise.reject(new TypeError("fetch failed")), async () => { await failsWith("network"); });
  await withFetch(() => json(422, { error: "Lean reported errors:\n  line 2: unsolved goals", kind: "lean" }), async () => {
    const e = await failsWith("lean");
    assert.match(e.source, /theorem t/);
  });
  // Older server without `kind`: recognised from the message.
  await withFetch(() => json(422, { error: "Lean reported errors:\n  line 2: x" }), async () => { await failsWith("lean"); });
  await withFetch(() => json(422, { error: "not allowed on the public server: IO" }), async () => { await failsWith("policy"); });
  await withFetch(() => json(429, { error: "too many uploads" }), async () => { await failsWith("limit"); });
  await withFetch(() => json(500, { error: "internal error", kind: "server" }), async () => { await failsWith("server"); });
  await withFetch(() => json(200, { trace: { id: "x", steps: [] } }), async () => { await failsWith("malformed"); });
});

test("upload: a valid trace from the server is accepted as is", async () => {
  const t = traces[0];
  await withFetch(() => json(200, { trace: t }), async () => {
    assert.deepEqual(await extractLeanFile(lean), t);
  });
});
