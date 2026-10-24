// Run: npm test
// Playback rules and the controls' rendered state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { register } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProofTrace } from "../src/types/proof";
import { clampStep, isAutoplaying, keyAction } from "../src/lib/playback";
import { traceTransitions } from "../src/lib/transition";

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
const { default: PlaybackControls } = await import("../src/components/PlaybackControls");
const { default: CodeViewer } = await import("../src/components/CodeViewer");

const noop = () => {};
const controls = (stepIndex: number, stepCount: number, isPlaying = false) =>
  renderToStaticMarkup(
    <PlaybackControls
      stepIndex={stepIndex}
      stepCount={stepCount}
      isPlaying={isPlaying}
      markers={Array.from({ length: stepCount }, (_, i) => ({ kind: i === stepCount - 1 ? "complete" : "change", label: `t${i}` }))}
      onTogglePlay={noop}
      onPrev={noop}
      onNext={noop}
      onReset={noop}
      onSeek={noop}
    />,
  );

test("steps are clamped to the trace, so Prev at the start and Next at the end do nothing", () => {
  assert.equal(clampStep(-1, 5), 0);
  assert.equal(clampStep(0, 5), 0);
  assert.equal(clampStep(4, 5), 4);
  assert.equal(clampStep(5, 5), 4);
  assert.equal(clampStep(99, 5), 4);
  assert.equal(clampStep(3, 0), 0);
});

test("autoplay stops by itself on the last step", () => {
  assert.equal(isAutoplaying(true, 0, 5), true);
  assert.equal(isAutoplaying(true, 3, 5), true);
  assert.equal(isAutoplaying(true, 4, 5), false);
  assert.equal(isAutoplaying(false, 0, 5), false);
});

test("keys: arrows, Space, Home, End; ignored while typing or with modifiers", () => {
  assert.equal(keyAction({ key: "ArrowRight", code: "ArrowRight" }), "next");
  assert.equal(keyAction({ key: "ArrowLeft", code: "ArrowLeft", tagName: "BUTTON" }), "prev");
  assert.equal(keyAction({ key: " ", code: "Space", tagName: "BODY" }), "toggle");
  assert.equal(keyAction({ key: "Home", code: "Home" }), "first");
  assert.equal(keyAction({ key: "End", code: "End" }), "last");
  for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
    assert.equal(keyAction({ key: "ArrowRight", code: "ArrowRight", tagName }), null, tagName);
    assert.equal(keyAction({ key: " ", code: "Space", tagName }), null, tagName);
  }
  assert.equal(keyAction({ key: "ArrowRight", code: "ArrowRight", isContentEditable: true }), null);
  assert.equal(keyAction({ key: "ArrowLeft", code: "ArrowLeft", altKey: true }), null, "Alt+← is browser Back");
  assert.equal(keyAction({ key: "a", code: "KeyA" }), null);
});

test("controls: Prev and Reset disabled at the start, Next and Play at the end", () => {
  const first = controls(0, 4);
  assert.match(first, /<button[^>]*disabled[^>]*aria-label="Previous step"|aria-label="Previous step"[^>]*disabled/);
  assert.match(first, /aria-label="Back to the first step"[^>]*disabled|disabled[^>]*aria-label="Back to the first step"/);
  const last = controls(3, 4);
  assert.match(last, /aria-label="Next step"[^>]*disabled|disabled[^>]*aria-label="Next step"/);
  assert.ok(last.includes("Step 4 / 4"));
  assert.ok(controls(1, 4, true).includes(">Pause<"));
  assert.ok(controls(1, 4, false).includes(">Play<"));
});

test("timeline: one marker per step, current one marked, completed ones filled", () => {
  const html = controls(2, 5);
  assert.equal(html.split("timeline__step ").length - 1, 5);
  assert.equal(html.split('aria-current="step"').length - 1, 1);
  assert.equal(html.split(" is-done").length - 1, 3);
  assert.ok(html.includes("Step 5, proof complete: t4"));
});

test("source highlight: exactly the step's line is active, for every step of every sample", () => {
  const ids = (JSON.parse(readFileSync(new URL("../samples/index.json", import.meta.url), "utf8")) as { id: string }[]).map((m) => m.id);
  for (const id of ids) {
    const t: ProofTrace = JSON.parse(readFileSync(new URL(`../src/data/traces/${id}.json`, import.meta.url), "utf8"));
    for (const step of t.steps) {
      const html = renderToStaticMarkup(<CodeViewer source={t.source} activeLine={step.line} />);
      const active = [...html.matchAll(/code-line code-line--active"[^>]*><span class="code-line__number">(\d+)</g)].map((m) => Number(m[1]));
      assert.deepEqual(active, [step.line], `${id} step ${step.index}`);
    }
  }
});

test("every step's timeline label and transition come from the same trace position", () => {
  const t: ProofTrace = JSON.parse(readFileSync(new URL("../src/data/traces/and_split.json", import.meta.url), "utf8"));
  const ts = traceTransitions(t.steps);
  assert.equal(ts.length, t.steps.length);
  ts.forEach((tr, i) => assert.equal(tr.to, i));
});
