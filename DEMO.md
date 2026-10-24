# Proof Player — 2-Minute Demo

## The Problem

Mathematical proofs can be difficult to follow, especially for beginners. When we see a complete proof, it is not always clear how each tactic changes the goal or how the proof reaches its conclusion.

## Our Idea

Proof Player makes proofs easier to understand by letting us step through them like a video. Instead of seeing only the final answer, we can explore the proof one step at a time and understand how the goals change.

## Live Demo

First, we will open `list_demo`. It demonstrates how repeated rewriting simplifies the reversal of a list.

Next, we will explore `graph_path`, which demonstrates a proof involving a graph-related example.

Finally, we will open `and_split`. Its initial goal contains a conjunction, meaning two statements must be proved. The `constructor` tactic splits it into two separate goals, and `rfl` solves each one.

## Why Is It Real?

The goal states are not typed by hand. Our extraction script uses Lean to compile the proofs and inserts `trace_state` after tactics to capture the actual proof states. These states are then saved as JSON and used by Proof Player.

## What Comes Next?

We could add more proof examples, improve the visualizations for different goal types, and provide clearer explanations for each tactic. This would make the tool useful for more complex proofs and help beginners learn formal reasoning interactively.