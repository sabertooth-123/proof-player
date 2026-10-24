import type { StateTransition } from "./transition";

// "Predict the next state": the learner guesses which kinds of change the next tactic
// makes, then we grade the guess against the comparison of Lean's two recorded states
// (the same comparison behind "What changed"). No model, no network: just the trace.

export type ChangeKind = "target" | "split" | "hypothesis" | "close" | "unchanged";

export const CHANGE_OPTIONS: { kind: ChangeKind; label: string }[] = [
  { kind: "target", label: "The target changes" },
  { kind: "split", label: "The goal splits" },
  { kind: "hypothesis", label: "A hypothesis is introduced" },
  { kind: "close", label: "A goal closes" },
  { kind: "unchanged", label: "Nothing structural changes" },
];

export const changeLabel = (k: ChangeKind) => CHANGE_OPTIONS.find((o) => o.kind === k)!.label;

/**
 * Which kinds of change the step actually made, or null when the two states couldn't
 * be matched reliably (then there is nothing fair to grade against).
 */
export function observedChanges(t: StateTransition): Set<ChangeKind> | null {
  if (!t.certain || t.from === null) return null;
  const seen = new Set<ChangeKind>();
  if (t.targetChanged) seen.add("target");
  if (t.kind === "split") seen.add("split");
  if (t.hypothesesAdded.length > 0) seen.add("hypothesis");
  if (t.closed.length > 0 || t.goalsAfter === 0) seen.add("close");
  if (seen.size === 0 && t.kind === "same") seen.add("unchanged");
  return seen;
}

export interface Grade {
  /** Your guess matched what happened exactly. */
  exact: boolean;
  right: ChangeKind[]; // you said it, and it happened
  wrong: ChangeKind[]; // you said it, and it didn't
  missed: ChangeKind[]; // it happened, and you didn't say it
  /** Set when the change was something none of the options describe (e.g. Lean moved to the next case). */
  other: boolean;
}

export function grade(predicted: Set<ChangeKind>, observed: Set<ChangeKind>): Grade {
  const right = [...predicted].filter((k) => observed.has(k));
  const wrong = [...predicted].filter((k) => !observed.has(k));
  const missed = [...observed].filter((k) => !predicted.has(k));
  return { exact: wrong.length === 0 && missed.length === 0, right, wrong, missed, other: observed.size === 0 };
}
