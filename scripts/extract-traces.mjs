#!/usr/bin/env node
// Turns samples/*.lean into src/data/traces/<id>.json using real Lean output.
//   1. instrument: insert `trace_state` after every tactic line
//   2. runLean:    `lean --json`, keep trace messages, map lines back to the clean file
//   3. parseGoals: Lean's goal text -> Goal[]
//   4. main:       attach manifest + explanations, write one ProofTrace per sample
// Usage: npm run traces            (all samples in samples/index.json)
//        npm run traces -- list_demo
// The dev server also calls buildTrace() for files uploaded in the app (see vite.config.ts).
// Set LEAN=/path/to/lean if `lean` is not on PATH.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLES = join(ROOT, "samples");
const EXPLANATIONS = join(ROOT, "explanations");
const OUT = join(ROOT, "src", "data", "traces");
const TURNSTILE = "⊢";

/** A problem with the sample (not a bug in this script). `detail` holds extra debug text for the CLI. */
export class ExtractError extends Error {
  constructor(message, detail = "") {
    super(message);
    this.detail = detail;
  }
}

// ---------- Step 1: instrument ----------

const indentOf = (line) => line.length - line.trimStart().length;
const isBlank = (line) => line.trim() === "" || line.trim().startsWith("--");
const opensBlock = (t) => t.endsWith(" by") || t === "by" || t.endsWith("=>");
const isBullet = (t) => t.startsWith("· ") || t.startsWith(". ");

/**
 * Returns the instrumented text plus, for each inserted trace_state, the original
 * 1-based line it follows. Steps follow source order; `... with` lines get no step
 * because Lean rejects a tactic between `with` and its first `|` alternative.
 */
export function instrument(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const header = lines.findIndex((l) => !isBlank(l) && opensBlock(l.trim()));
  if (header === -1) throw new ExtractError("no line ending in `by` found");
  const later = lines.slice(header + 1).find((l) => /^(theorem|lemma|example|def)\b/.test(l));
  if (later) throw new ExtractError(`one theorem per sample file; found a second one: "${later.trim()}"`);

  const nextCode = (i) => {
    for (let j = i + 1; j < lines.length; j++) if (!isBlank(lines[j])) return j;
    return -1;
  };

  const out = [];
  const origOf = []; // instrumented line index -> original 1-based line (inserted lines map to the line they follow)
  const steps = []; // { origLine, tactic, instrLine, slot } (slot: which trace on that line, left to right)
  const keep = (text, origIdx) => {
    out.push(text);
    origOf.push(origIdx + 1);
  };
  const emit = (text, origIdx, indent) => {
    keep(text, origIdx);
    keep(" ".repeat(indent) + "trace_state", origIdx);
    steps.push({ origLine: origIdx + 1, tactic: text.trim(), instrLine: out.length, slot: 0 });
  };
  // `| zero => rfl`: a new line can't go between two alternatives, so trace on the same line,
  // twice: the case's goal (like a `| zero =>` line of its own), then after its tactic.
  const emitInline = (text, origIdx) => {
    const at = text.indexOf(" => ") + 4;
    keep(`${text.slice(0, at)}trace_state; ${text.slice(at)}; trace_state`, origIdx);
    const line = out.length;
    steps.push({ origLine: origIdx + 1, tactic: text.slice(0, at).trim(), instrLine: line, slot: 0 });
    steps.push({ origLine: origIdx + 1, tactic: text.slice(at).trim(), instrLine: line, slot: 1 });
  };

  lines.forEach((line, i) => {
    if (i < header || isBlank(line)) return keep(line, i);
    const t = line.trim();
    const next = nextCode(i);
    const nextIndent = next === -1 ? indentOf(line) : indentOf(lines[next]);

    if (i === header) {
      // A wrapped theorem header is often indented deeper than the proof body.
      if (next === -1) throw new ExtractError("the proof after `by` is empty");
      return emit(line, i, nextIndent);
    }
    if (t.endsWith(" with")) return keep(line, i);
    if (t.startsWith("| ") && t.includes(" => ") && !opensBlock(t)) return emitInline(line, i);
    if (opensBlock(t)) {
      if (next === -1 || nextIndent <= indentOf(line)) throw new ExtractError(`line ${i + 1}: block "${t}" has no body`);
      return emit(line, i, nextIndent);
    }
    if (isBullet(t)) {
      // `· tac` with a deeper block under it: trace inside the bullet, after `tac`.
      // A one-line bullet closes its goal, so trace after it at the bullet's own
      // indent instead; that shows the goals still open (e.g. `case right`).
      const opensBody = next !== -1 && nextIndent > indentOf(line);
      return emit(line, i, opensBody ? indentOf(line) + 2 : indentOf(line));
    }
    if (i > header && next !== -1 && nextIndent > indentOf(line)) {
      throw new ExtractError(`line ${i + 1}: multi-line tactics are not supported; keep "${t}" on one line`);
    }
    emit(line, i, indentOf(line));
  });

  return { text: out.join("\n"), steps, origOf };
}

// ---------- Step 2: run Lean ----------

function leanBinary() {
  if (process.env.LEAN) return process.env.LEAN;
  const elan = join(homedir(), ".elan", "bin", process.platform === "win32" ? "lean.exe" : "lean");
  return existsSync(elan) ? elan : "lean";
}

export function leanVersion() {
  const r = spawnSync(leanBinary(), ["--version"], { encoding: "utf8" });
  if (r.error) throw new ExtractError(`cannot run lean (${r.error.message}); install elan or set LEAN`);
  return r.stdout.match(/version (\S+?),/)?.[1] ?? r.stdout.trim();
}

/**
 * Runs Lean on the instrumented text. Returns trace messages keyed by instrumented line;
 * each value lists that line's traces left to right (one-line `| c => tac` lines have two).
 */
export function runLean(instrumented, origOf = [], timeoutMs = 120_000) {
  const dir = mkdtempSync(join(tmpdir(), "proof-player-"));
  const file = join(dir, "Sample.lean");
  try {
    writeFileSync(file, instrumented, "utf8");
    // encoding: "utf8" matters on Windows: the default code page garbles the turnstile.
    const r = spawnSync(leanBinary(), ["--json", file], { encoding: "utf8", timeout: timeoutMs });
    if (r.error?.code === "ETIMEDOUT") throw new ExtractError(`Lean took longer than ${timeoutMs / 1000} s and was stopped`);
    if (r.error) throw new ExtractError(`lean failed to start: ${r.error.message}`);
    const messages = r.stdout.split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const errors = messages.filter((m) => m.severity === "error");
    if (errors.length) {
      const where = (line) => (origOf[line - 1] ? `line ${origOf[line - 1]}` : `instrumented line ${line}`);
      const shown = errors.map((m) => `  ${where(m.pos.line)}: ${m.data}`).join("\n");
      throw new ExtractError(`Lean reported errors:\n${shown}`, `--- instrumented file ---\n${numbered(instrumented)}`);
    }
    const traces = new Map();
    const inOrder = messages.filter((m) => m.kind === "trace").sort((a, b) => a.pos.line - b.pos.line || a.pos.column - b.pos.column);
    for (const m of inOrder) traces.set(m.pos.line, [...(traces.get(m.pos.line) ?? []), m.data]);
    return traces;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const numbered = (text) => text.split("\n").map((l, i) => `${String(i + 1).padStart(3)} | ${l}`).join("\n");

// ---------- Step 3: parse goals ----------

/** Parses one trace_state payload. Empty string means no goals. */
export function parseGoals(data) {
  if (data.trim() === "") return [];
  return data.split(/\n\s*\n/).map(parseGoal);
}

function parseGoal(block) {
  const lines = block.split("\n");
  let i = 0;
  const goal = lines[0].startsWith("case ")
    ? { caseName: lines[i++].slice(5).trim(), hypotheses: [], target: "" }
    : { hypotheses: [], target: "" };

  let inTarget = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const continuation = /^\s/.test(line);
    if (line.startsWith(TURNSTILE)) {
      inTarget = true;
      goal.target = line.slice(TURNSTILE.length).trim();
    } else if (inTarget || continuation) {
      // Lean wraps long terms onto indented lines; fold them back into one.
      if (inTarget) goal.target += " " + line.trim();
      else if (goal.hypotheses.length) goal.hypotheses.at(-1).type += " " + line.trim();
    } else {
      const colon = line.indexOf(" : ");
      if (colon === -1) throw new ExtractError(`unexpected goal line: "${line}"`);
      goal.hypotheses.push({ names: line.slice(0, colon).trim().split(/\s+/), type: line.slice(colon + 3).trim() });
    }
  }
  if (!inTarget) throw new ExtractError(`goal without ${TURNSTILE}:\n${block}`);
  return goal;
}

// ---------- Step 4: assemble ----------

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Reads samples/<id>.lean and explanations/<id>.json, then builds the trace. */
export function extract(meta, version, today) {
  const source = readFileSync(join(SAMPLES, `${meta.id}.lean`), "utf8");
  const explanationsPath = join(EXPLANATIONS, `${meta.id}.json`);
  const explanations = readJson(explanationsPath, null);
  if (!explanations) console.warn(`  warning: no ${meta.id}.json in explanations/, using empty explanations`);
  return buildTrace(meta, source, version, today, { explanations, explanationsPath });
}

/** Runs Lean on `source` and returns a ProofTrace. Also used by the dev server's upload endpoint. */
export function buildTrace(meta, rawSource, version, today, { explanations = null, explanationsPath = "explanations", timeoutMs } = {}) {
  const source = rawSource.replace(/\r\n/g, "\n");
  const { text, steps, origOf } = instrument(source);
  const traces = runLean(text, origOf, timeoutMs);

  if (explanations && explanations.length !== steps.length) {
    throw new ExtractError(`${explanationsPath} has ${explanations.length} sentences but the proof has ${steps.length} steps`);
  }

  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    source,
    viz: meta.viz,
    provenance: { lean: version, extractedAt: today },
    steps: steps.map((s, index) => {
      const raw = traces.get(s.instrLine)?.[s.slot];
      if (raw === undefined) throw new ExtractError(`no trace output for line ${s.origLine} ("${s.tactic}")`);
      return {
        index,
        line: s.origLine,
        tactic: s.tactic,
        goals: parseGoals(raw),
        explanation: explanations?.[index] ?? "",
        raw, // kept verbatim so the app can show Lean's own words next to the parsed goals
      };
    }),
  };
}

// ---------- Uploaded files ----------

/** Picks a picture for a proof nobody wrote a manifest entry for, from its goals alone. */
export function guessViz(steps) {
  const goals = steps.flatMap((s) => s.goals);
  const texts = goals.flatMap((g) => [g.target, ...g.hypotheses.map((h) => h.type)]);
  if (texts.some((t) => /\(\s*\d+\s*,\s*\d+\s*\)/.test(t))) return "graph";
  const listBothSides = (t) => {
    const at = t.indexOf(" = ");
    const hasList = (s) => /\[[^\]]+\]/.test(s); // a non-empty literal like [1, 2]; `[]` alone isn't a picture
    return at !== -1 && hasList(t.slice(0, at)) && hasList(t.slice(at + 3));
  };
  if (goals.some((g) => listBothSides(g.target))) return "list";
  return "goal";
}

/** Name of the theorem/lemma/example being proved, for the dropdown title. */
export function theoremName(source) {
  const m = source.match(/^\s*(?:theorem|lemma)\s+([^\s:({[]+)/m);
  return m ? m[1] : /^\s*example\b/m.test(source) ? "example" : null;
}

function main() {
  const manifest = readJson(join(SAMPLES, "index.json"), null);
  if (!manifest) throw new ExtractError("samples/index.json is missing");
  const wanted = process.argv.slice(2);
  const selected = wanted.length ? manifest.filter((m) => wanted.includes(m.id)) : manifest;
  if (wanted.length && selected.length !== wanted.length) throw new ExtractError(`unknown sample id in: ${wanted.join(", ")}`);

  const version = leanVersion();
  const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
  console.log(`Lean ${version}`);

  let failed = 0;
  for (const meta of selected) {
    try {
      const trace = extract(meta, version, today);
      writeFileSync(join(OUT, `${meta.id}.json`), JSON.stringify(trace, null, 2) + "\n", "utf8");
      const done = trace.steps.at(-1).goals.length === 0 ? "proof complete" : "GOALS REMAIN";
      console.log(`  ${meta.id}: ${trace.steps.length} steps, ${done}`);
    } catch (e) {
      if (!(e instanceof ExtractError)) throw e;
      failed++;
      console.error(`  ${meta.id}: FAILED\n${e.message}${e.detail ? `\n${e.detail}` : ""}`);
    }
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    if (!(e instanceof ExtractError)) throw e;
    console.error(e.message);
    process.exit(1);
  }
}
