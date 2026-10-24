---
title: Proof Player Lean
emoji: 🧮
colorFrom: green
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Proof Player Lean server

Runs Lean 4.35.0 for [Proof Player](https://proof-player-eight.vercel.app/)'s **Open .lean file**:
it inserts `trace_state` after every tactic, runs `lean --json`, and returns the parsed goals.

- `GET /api/lean`: `{ available, version }`
- `POST /api/extract` with `{ name, source }`: `{ trace }` or `{ error }`

Only plain definitions and proofs are accepted (no `#eval`, `import`, IO, custom syntax),
files up to 50 KB, 20 s of Lean time each, 15 uploads per minute per client.

Source: https://github.com/sabertooth-123/proof-player (`lean-server/`).
