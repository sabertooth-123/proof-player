# Proof Player

Syntax Error 2026, Functional Programming track, problem 3. Step through a Lean proof one line at a time; the goal panel shows what Lean reports after that line, and the picture is computed from the goal.

## Run it

```bash
npm install
npm run dev
```

You do not need Lean to run the app. Traces in `src/data/traces/` are committed JSON.

## Layout

| Path | Owner | What |
|---|---|---|
| `samples/` | M1 | Clean `.lean` files (no `trace_state`). Must compile with `lean`. |
| `explanations/` | M1 | `<id>.json`: one sentence per step. |
| `scripts/extract-traces.mjs` | M4 | Inserts `trace_state`, runs `lean --json`, writes traces. |
| `src/types/proof.ts` | all | The contract. Frozen; announce changes before merging. |
| `src/data/traces/` | M4 | Generated traces. `mock.json` until real ones land. |
| `src/hooks/`, `src/components/` | M2 | Player state, shell, code viewer, controls. |
| `src/components/` (Goal/Viz panels), `src/viz/` | M3 | Goal panel and derived visualizations. |

## Rules

- `main` always runs; `npm run build` must pass before every merge.
- Branches: `feat/samples` (M1), `feat/player` (M2), `feat/viz` (M3), `feat/extract` (M4).
- Only M4 edits `package.json`; only M2 edits `App.tsx`.

## Regenerating traces (needs Lean)

```bash
npm run traces
```

Run one sample only: `npm run traces -- rev_three`. If `lean` is not on PATH or in `~/.elan/bin`, set `LEAN` to its path.

To add a sample: write `samples/<id>.lean`, add `{ id, title, description, viz }` to `samples/index.json`, optionally add `explanations/<id>.json` (one sentence per step), then run `npm run traces` and commit the new `src/data/traces/<id>.json`.

## Writing samples (M1)

- One theorem per file, and it must compile with `lean samples/<id>.lean`.
- One tactic per line. A tactic split across lines is rejected.
- `induction x with` / `cases x with` are fine; the `| case =>` lines become steps.
- `·` bullets are fine.
- If the explanations file exists, its sentence count must equal the step count (the script tells you the count).

## Extractor notes (M4)

- `lean` stdout is read as **UTF-8**. On Windows the default decoding garbles `⊢` into `âŠ¢`.
- `trace_state` placement: after a tactic, at that tactic's indent; after a line ending in `by` or `=>`, at the next line's indent; after a `·` bullet, at its indent + 2. Never directly after a line ending in `with`.
- An empty trace means no goals remain in that branch.
- Lean errors are reported with the line number in the original sample.
