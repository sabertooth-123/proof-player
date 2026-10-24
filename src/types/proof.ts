// The shared contract. Frozen after Hour 0: announce any change in the team chat before merging.
// Every field except `explanation` is produced by scripts/extract-traces.mjs from real `lean --json` output.

/** One hypothesis line, e.g. "a b : Nat" -> { names: ["a", "b"], type: "Nat" }. */
export interface Hypothesis {
  names: string[];
  type: string;
}

/** One goal as Lean prints it: optional `case X` line, hypotheses, then the ⊢ target. */
export interface Goal {
  caseName?: string; // "nil", "cons"
  hypotheses: Hypothesis[];
  target: string; // text after ⊢
}

export interface ProofStep {
  index: number; // 0 = initial state, before any tactic runs
  line: number; // 1-based line in the ORIGINAL sample; step 0 points at the `:= by` line
  tactic: string; // that line's text, trimmed
  goals: Goal[]; // [] = this branch (or the whole proof) is closed
  explanation: string; // human-written, from explanations/<id>.json
}

export type VizKind = "list" | "graph" | "goal";

export interface ProofTrace {
  id: string;
  title: string;
  description: string;
  source: string; // original .lean text, without trace_state lines
  viz: VizKind; // which deriver runs on each step
  provenance: { lean: string; extractedAt: string }; // shown in the UI
  steps: ProofStep[];
}

/** Owned by M3. Built only from goals, never from the step index. */
export interface VizFrame {
  items?: { id: string; label: string; changed: boolean }[]; // list view
  nodes?: { id: string; label: string; current?: boolean }[]; // graph view; current = where the proof is standing now
  edges?: { from: string; to: string; isNew: boolean }[];
}

export type DeriveViz = (current: Goal[], previous: Goal[] | null) => VizFrame;

/** Owned by M2. The ONLY place that holds the selected step. */
export interface PlayerState {
  traceId: string;
  stepIndex: number;
}
