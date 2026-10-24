# Proof Player: submission text

Paste-ready answers for the submission form. Track: Functional Programming (FP Launchpad, problem 3).

## Links

- **Live demo:** https://proof-player-eight.vercel.app/
- **Code:** https://github.com/sabertooth-123/proof-player (tag `v1-demo`)
- **Video:** _add the backup video link here_

## One line

Step through a Lean 4 proof one tactic at a time, like scrubbing a video, and see exactly what Lean still has to prove, what each line changed, and a picture of it.

## Short description (about 100 words)

A finished Lean proof is a wall of tactics: each line changes an invisible proof state that you normally only see inside an editor with Lean installed. Proof Player makes that state visible. Pick a proof and press Play or →. The active line is highlighted, the goals panel shows Lean's real goals, a "What changed" line summarises the transition ("Split main goal into 2 goals: left, right"), and a picture follows along: list boxes that rearrange, a path growing through a graph, goals that split and close. None of it is hand-typed. Every state is extracted from Lean with `trace_state`.

## What's technically interesting

- **Real Lean, not mock data.** A Node extractor inserts `trace_state` after every tactic, runs `lean --json` (Lean 4.35.0), parses the goals and keeps Lean's raw text. "Show raw Lean output" displays it, and the test suite re-parses every trace from that raw text so the UI can't drift from Lean.
- **Honest state comparison.** "What changed", the highlights and the timeline come from comparing consecutive Lean states:
  - goals are matched by case tags or by one goal splitting;
  - a goal hidden by `·`/`case` focus is "still open", never falsely "closed";
  - ambiguous cases say "Goal structure changed" instead of guessing.
- **Pictures are pure functions of the goal text**, never of the step number. When a state has nothing to draw, the panel says so and falls back to the open goals.
- **Open any .lean file.** The same pipeline runs on an uploaded proof, locally or through a locked-down public Lean server:
  - only definitions and proofs are accepted (no `#eval`, `import`, IO or custom syntax);
  - limited to 50 KB, 20 s and 15 uploads a minute;
  - Lean's own errors are shown with the offending line.
- **Predict mode for learners.** Guess what the next tactic changes, then see it graded against Lean's actual states. No AI involved.
- **71 automated tests and CI** (lint, build, tests, a UTF-16 guard) on every push.

## How to try it (about 1 minute)

1. Open the live demo. It starts on **Reversing a list**. Press **Play**.
2. Pick **Splitting a conjunction** and click the 2nd timeline marker: one goal splits into `case left` and `case right`.
3. Click **Show raw Lean output** to see the exact text Lean printed.
4. Optional: click **Predict**, then **→**, guess, and press **Reveal**.

## Honest limitations

- The extractor supports one theorem per file and one tactic per line. Multi-line tactics are rejected with a clear message.
- The list and graph pictures recognise specific shapes (list literals around `=`, and `(a, b)` pairs); other proofs use the goal view.
- Uploading on the live site needs our Lean server to be running. Vercel can't host Lean, so it currently runs on a team laptop through a tunnel; if the button is missing, the server is offline. Everything else works offline from committed traces.

## Built with

TypeScript, React 19, Vite, Lean 4.35.0, Node (extractor and Lean server), Vercel, GitHub Actions.
