# Proof Player: 2-minute demo

Open https://proof-player-eight.vercel.app/ full screen before you start. **Bold** is what you click; quotes are what you say.

## 1. The problem (15 s)

"A finished Lean proof is a wall of tactics. You can't see what each line actually did unless you run Lean yourself and click through it line by line."

## 2. The idea (10 s)

"Proof Player lets you step through a proof like a video. Next to the code, the goals and a picture keep up with each line."

## 3. Live demo (70 s)

The page opens on **Reversing a list**. Press **Play**.

"Each `rw [List.reverse_cons]` peels one element off the front and moves it to the back. Watch the highlighted box move. The top row is where the proof is now, the dashed row is what it has to become. When they match, `rfl` closes it."

**Select a proof → Finding a path in a graph**, then press **→** a few times.

"Each `have` proves one edge is in the graph, and each `apply` walks along it. The filled node is where the proof stands, and the path 1 → 2 → 5 → 6 grows edge by edge."

**Select a proof → Splitting a conjunction**, press **→** twice.

"`constructor` splits the ∧ into two goals, case left and case right." Press **→**. "`rfl` closes the left one, and only the right goal is left." Press **→**. "And that one closes too: proof complete."

## 4. Why it's real (20 s)

Click **Show raw Lean output**.

"None of this is typed by hand. Our script inserts Lean's `trace_state` after every tactic, runs Lean, and saves what it prints. This is that exact text. The goals panel and every picture are computed from it, and our tests check that they match."

## 5. What's next (5 s)

"Next: load any Lean file, more kinds of pictures, and running Lean live so you can edit a proof and watch it change."

## If something goes wrong

- The live site doesn't load: run `npm run dev` from the repo and use `http://localhost:5173`.
- No internet at all: play the backup video.
