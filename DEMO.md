# Proof Player: 2-minute demo

Open https://proof-player-eight.vercel.app/ full screen (1366×768 or larger) before you start. **Bold** is what you click; quotes are what you say.

**Before judging:**
- On the presenting laptop, run `npm run live` and wait about a minute for the redeploy. Then the **Open .lean file** button appears on the live site.
- Keep `examples/maze_escape.lean` in a file window, ready to drag.
- If upload isn't available, skip step 5 or show it with `npm run dev` on localhost.

## 1. The problem (15 s)

"A finished Lean proof is a wall of tactics. Each line changes an invisible proof state, and normally you only see it inside an editor with Lean installed."

## 2. One proof, step by step (40 s)

The page opens on **Reversing a list**. Point at the hint "Press Play, or → …", then press **→** twice.

"The highlighted line is the tactic that just ran. On the right is exactly what Lean has left to prove. **What changed** says the target changed, and the boxes show it: each `rw [List.reverse_cons]` moves the front element to the back."

Press **Play** and let it finish.

"It stops by itself when the proof is complete. The timeline at the bottom has one marker per step; I can click any of them to jump."

## 3. Goals splitting and closing (25 s)

**Select a proof → Splitting a conjunction**, then click the **2nd timeline marker**.

"`constructor` split one goal into two, case left and case right. The marker is cyan because goals split here. Lean works on the goal marked current." Press **→**. "rfl closed the left one, and only right is left." Press **→**. "Proof complete."

## 4. Why you can trust it (20 s)

Click **Show raw Lean output**.

"None of this is typed by hand. Our script inserts Lean's `trace_state` after every tactic, runs Lean, and keeps exactly what it prints. This is that text, the goals are parsed from it, and our tests fail if they ever disagree. The pictures and the 'what changed' line are our interpretation, and they're computed only from these states."

Click **Show goals** again.

## 5. Your own proof (20 s, only if the upload button is visible)

Drag **maze_escape.lean** onto the page.

"Any Lean file goes through the same pipeline, on a real Lean server, in about a second. Here a path escapes a 13-room maze one edge at a time." Press **→** a few times. "And if the proof is wrong, you get Lean's own error, pointing at your line."

## Close (5 s)

"Proof Player: every state from Lean, every picture computed from it. Next we want to support any proof layout and run Lean on a permanent server."

## If something goes wrong

- **The live site doesn't load:** run `npm run dev` in the repo and open `http://localhost:5173`. Upload works there too.
- **No upload button on the live site:** the laptop's tunnel is down. Run `npm run live` (about a minute) or skip step 5.
- **No internet at all:** play the backup video.
