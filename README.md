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

## Extractor notes (M4)

- Read `lean` stdout as **UTF-8**. On Windows the default decoding garbles `⊢` into `âŠ¢`.
- No `trace_state` directly after a line ending in `with`.
- An empty `data` string means no goals remain in that branch.
