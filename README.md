# Proof Player

Step through a Lean 4 proof one tactic at a time, like scrubbing a video. After each line you see exactly what Lean has left to prove, and a picture of it: list boxes that rearrange, a path that grows through a graph, goals that split and close.

Syntax Error 2026, Functional Programming track, problem 3.

**Live demo:** https://proof-player-eight.vercel.app/

## Why it's real

Nothing on screen is typed by hand. The goals come from Lean itself:

```
samples/*.lean  ──►  insert trace_state after every tactic  ──►  lean --json  ──►  parse goals  ──►  src/data/traces/*.json  ──►  app
```

- `scripts/extract-traces.mjs` inserts Lean's `trace_state` tactic after each line, runs `lean --json`, and parses the goal text Lean prints (hypotheses, `⊢` target, `case` names).
- Each step also keeps Lean's text verbatim. **Show raw Lean output** in the Goals panel displays it, and `npm test` checks that the parsed goals match it exactly.
- Every trace records the Lean version it was extracted with, shown in the app under the goal panel.
- Each picture is computed from the goal text alone, never from the step number. If Lean's goal changes, the picture changes.
- Change a sample, rerun `npm run traces`, and the app shows Lean's new answer.

## Run it

```bash
npm install
npm run dev
```

You do not need Lean to run the app: the traces are committed JSON.

## Using it

- Pick a proof from **Select a proof**.
- **Prev / Next** or `←` / `→` step back and forward; **Reset** goes to the start.
- **Play** (or `Space`) steps once a second and stops at the end; any other control pauses it.
- **Show raw Lean output** swaps the parsed goals for Lean's own `trace_state` text at that step.
- The active line is highlighted in the code; the tactic and a one-sentence explanation sit under the controls.

## Checks

```bash
npm run build   # type-check and production build
npm test        # derivers on real traces, both panels at every step of every proof,
                # and every trace's goals re-parsed from Lean's raw output
npm run lint
```

GitHub Actions runs all three on every pull request and push to `main` (`.github/workflows/ci.yml`). Vercel deploys `main` straight to the live demo, so merge only green PRs.

## Regenerating traces (needs Lean)

Install Lean with [elan](https://github.com/leanprover/elan) (traces were made with Lean 4.35.0), then:

```bash
npm run traces
```

Run one sample only: `npm run traces -- list_demo`. If `lean` is not on PATH or in `~/.elan/bin`, set `LEAN` to its path.

To add a sample: write `samples/<id>.lean`, add `{ id, title, description, viz }` to `samples/index.json` (`viz` is `list`, `graph` or `goal`), optionally add `explanations/<id>.json` (one sentence per step), then run `npm run traces` and commit the new `src/data/traces/<id>.json`.

## Layout

| Path | Owner | What |
|---|---|---|
| `samples/` | M1 | Clean `.lean` files (no `trace_state`). Must compile with `lean`. |
| `explanations/` | M1 | `<id>.json`: one sentence per step. |
| `scripts/extract-traces.mjs` | M4 | Inserts `trace_state`, runs `lean --json`, writes traces. |
| `src/types/proof.ts` | all | The contract. Frozen; announce changes before merging. |
| `src/data/traces/` | M4 | Generated traces (`mock.json` is only a fallback). |
| `src/hooks/`, `src/App.*`, `src/components/` (shell, code viewer, controls, selector) | M2 | Player state and layout. |
| `src/components/` (Goal/Visualization panels, HowItWorks), `src/viz/` | M3 | Goal panel and derived pictures. |
| `tests/` | M3/M4 | `npm test`. |

## Team rules

- `main` always runs; `npm run build` and `npm test` must pass before every merge (CI shows a red ✗ on the PR if not).
- Work on a branch from a fresh `main`, open a PR, and only edit your own files.
- Save files from the editor, not with PowerShell `>` (it writes UTF-16).

## Writing samples (M1)

- One theorem per file, and it must compile with `lean samples/<id>.lean`.
- One tactic per line. A tactic split across lines is rejected.
- `induction x with` / `cases x with` are fine; the `| case =>` lines become steps.
- `·` bullets are fine.
- If the explanations file exists, its sentence count must equal the step count (the script tells you the count). Each sentence describes the state after its line runs.

## Extractor notes (M4)

- `lean` stdout is read as **UTF-8**. On Windows the default decoding garbles `⊢` into `âŠ¢`.
- `trace_state` placement: after a tactic, at that tactic's indent; after a line ending in `by` or `=>`, at the next line's indent; after a one-line `·` bullet, at the bullet's own indent (so the goals still open show); after a `·` bullet that opens a deeper block, at its indent + 2. Never directly after a line ending in `with`.
- An empty trace means no goals remain in that branch.
- Lean errors are reported with the line number in the original sample.
