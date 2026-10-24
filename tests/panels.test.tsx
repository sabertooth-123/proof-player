// Run: npx tsx --test tests/panels.test.tsx
// Renders both panels to HTML for EVERY real trace and checks what a person would see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import React from "react";
import { register } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProofTrace } from "../src/types/proof";

// Outside Vite, tsx compiles JSX the classic way (React.createElement), so make React global.
(globalThis as { React?: typeof React }).React = React;

// Components import a .css file, which Vite understands but plain Node does not.
// Teach Node to treat any .css import as an empty module, then load the components.
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
const { HowItWorks } = await import("../src/components/HowItWorks");

const dir = new URL("../src/data/traces/", import.meta.url);
const traces: ProofTrace[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "mock.json")
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

test("there are real traces to check", () => assert.ok(traces.length >= 3));

for (const t of traces) {
  test(`${t.id}: goal panel shows case names, targets, and 'Proof complete' only at the very end`, () => {
    const last = t.steps.length - 1;
    t.steps.forEach((step, k) => {
      const html = renderToStaticMarkup(
        <GoalPanel goals={step.goals} previous={k ? t.steps[k - 1].goals : null} isFinal={k === last} />,
      );
      if (step.goals.length === 0) {
        assert.ok(html.includes(k === last ? "Proof complete" : "Goal closed"), `${t.id} step ${k}`);
      }
      assert.equal(html.includes("Proof complete"), k === last && step.goals.length === 0, `${t.id} step ${k}`);
      for (const g of step.goals) {
        if (g.caseName) assert.ok(html.includes(`case ${g.caseName}`), `${t.id} step ${k}: case ${g.caseName}`);
        assert.ok(html.includes(esc(g.target)), `${t.id} step ${k}: target`);
      }
    });
    assert.equal(t.steps[last].goals.length, 0, "a finished proof ends with no goals");
  });

  test(`${t.id}: visualization panel renders at every step without crashing`, () => {
    t.steps.forEach((step, k) => {
      const html = renderToStaticMarkup(
        <VisualizationPanel kind={t.viz} goals={step.goals} previous={k ? t.steps[k - 1].goals : null} />,
      );
      assert.ok(html.includes("pp-panel"), `${t.id} step ${k}`);
    });
  });
}

test("list view separates Current from Target", () => {
  const t = traces.find((x) => x.id === "list_demo")!;
  const html = renderToStaticMarkup(<VisualizationPanel kind="list" goals={t.steps[1].goals} previous={t.steps[0].goals} />);
  assert.ok(html.includes("Current") && html.includes("Target") && html.includes("pp-divider"));
});

test("graph view marks one current node and one newest edge", () => {
  const t = traces.find((x) => x.id === "graph_path")!;
  const html = renderToStaticMarkup(<VisualizationPanel kind="graph" goals={t.steps[4].goals} previous={t.steps[3].goals} />);
  assert.equal(html.split("pp-node-current").length - 1, 1);
  assert.equal(html.split("pp-edge-label").length - 1, 1);
  assert.ok(html.includes("newest"));
});

test("every CSS animation or transition is under 200 ms", () => {
  const css = readFileSync(new URL("../src/viz/viz.css", import.meta.url), "utf8");
  const times = [...css.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => Number(m[1]) * (m[2] === "s" ? 1000 : 1));
  assert.ok(times.length > 0 && times.every((ms) => ms < 200), `found ${times.join(", ")} ms`);
});

test("the real app never imports the dev-only preview", () => {
  for (const f of ["../src/App.tsx", "../src/main.tsx", "../index.html"]) {
    const text = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/dev\/|M3Preview|devMain/.test(text), `${f} references dev code`);
  }
});

test("HowItWorks: four boxes with three arrows, no props needed", () => {
  const html = renderToStaticMarkup(<HowItWorks />);
  assert.equal(html.split("pp-how-arrow").length - 1, 3);
  assert.equal((html.match(/<li/g) ?? []).length, 7); // 4 boxes + 3 arrows
  for (const t of ["Lean proof", "trace_state", "after every tactic", "real goals from", "lean --json", "picture computed from the goal"]) {
    assert.ok(html.includes(t), t);
  }
});
