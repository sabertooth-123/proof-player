import type { Goal, Hypothesis } from "../types/proof";

// Compares two recorded proof states (Lean's goal lists before and after a step).
// It reports only what the two snapshots support. Goals are matched by Lean's case
// tags, by a single goal staying single, or by one goal splitting into several.
// When none of those hold, the match is "uncertain" and no per-goal claims are made.
//
// One subtlety: inside a `·` block or a `| case =>` alternative Lean shows only the
// focused goal, so sibling goals vanish from the snapshot without being proved. A
// vanished goal therefore counts as *closed* only when the step changed nothing else;
// if the step visibly worked on another goal, the vanished ones are *hidden by focus*.

export const hypKey = (h: Hypothesis) => `${h.names.join(" ")} : ${h.type}`;

/** How a goal after the step relates to the goals before it. */
export type GoalRelation =
  | "same" // the same goal (same case tag, or the only goal on both sides)
  | "child" // split off a previous goal (`left.right` from `left`, or 1 goal → many)
  | "new" // appeared with no goal it can be traced to (e.g. the next case of an induction)
  | "uncertain"; // several untagged goals: can't tell which is which

export interface GoalMatch {
  goal: Goal;
  label: string;
  relation: GoalRelation;
  previous: Goal | null; // the goal it is the same as, or split from
  hypothesesAdded: Hypothesis[];
  hypothesesRemoved: Hypothesis[];
  targetChanged: boolean;
}

export type TransitionKind = "start" | "split" | "close" | "complete" | "focus" | "change" | "same" | "restructure";

export interface StateTransition {
  from: number | null; // index of the step before; null for the first step
  to: number;
  goalsBefore: number;
  goalsAfter: number;
  matches: GoalMatch[]; // one per goal after the step, in Lean's order
  created: string[]; // goals that weren't there before
  closed: string[]; // goals that were there, vanished, and nothing else changed
  hidden: string[]; // goals that vanished because Lean is focused on another branch
  hypothesesAdded: Hypothesis[];
  hypothesesRemoved: Hypothesis[];
  targetChanged: boolean;
  complete: boolean; // no goals remain after the last step
  certain: boolean; // false: goals couldn't be matched, per-goal changes are omitted
  kind: TransitionKind;
  summary: string[];
}

/** Lean's case tag, or a positional name for untagged goals. */
export const goalLabel = (g: Goal, i: number, total: number) =>
  g.caseName ?? (total === 1 ? "main goal" : `goal ${i + 1}`);

const isChildTag = (child: string | undefined, parent: string | undefined) =>
  !!child && !!parent && child.startsWith(parent + ".");

// Lean groups hypotheses that share a type (`xs ys : List Nat`), and the grouping can
// change between steps without anything being added, so compare one name at a time.
const atoms = (hs: Hypothesis[]) => new Set(hs.flatMap((h) => h.names.map((n) => `${n} : ${h.type}`)));

/** Hypotheses of `from` whose name/type pairs are missing in `against`, keeping Lean's grouping. */
function missing(from: Hypothesis[], against: Set<string>): Hypothesis[] {
  return from
    .map((h) => ({ names: h.names.filter((n) => !against.has(`${n} : ${h.type}`)), type: h.type }))
    .filter((h) => h.names.length > 0);
}

function diff(goal: Goal, prev: Goal | null) {
  if (!prev) return { hypothesesAdded: [], hypothesesRemoved: [], targetChanged: false };
  return {
    hypothesesAdded: missing(goal.hypotheses, atoms(prev.hypotheses)),
    hypothesesRemoved: missing(prev.hypotheses, atoms(goal.hypotheses)),
    targetChanged: prev.target !== goal.target,
  };
}

/** Is any name of hypothesis `h` (as shown now) among `added`? Used to highlight lines. */
export const isAdded = (h: Hypothesis, added: Hypothesis[]) =>
  added.some((a) => a.type === h.type && a.names.some((n) => h.names.includes(n)));

/** Matches each goal after a step to the goal it came from, when the snapshots allow it. */
export function matchGoals(previous: Goal[] | null, current: Goal[]): GoalMatch[] {
  const label = (g: Goal, i: number) => goalLabel(g, i, current.length);
  const make = (goal: Goal, i: number, relation: GoalRelation, prev: Goal | null): GoalMatch => ({
    goal, label: label(goal, i), relation, previous: prev, ...diff(goal, prev),
  });
  if (!previous) return current.map((g, i) => make(g, i, "new", null));

  const tagged = previous.every((g) => g.caseName) && new Set(previous.map((g) => g.caseName)).size === previous.length;

  return current.map((goal, i) => {
    // One goal before and after: the same goal, even if it just gained a case tag
    // (the main goal becoming `case zero` inside an alternative).
    if (previous.length === 1 && current.length === 1) return make(goal, i, "same", previous[0]);
    if (goal.caseName && tagged) {
      const same = previous.find((p) => p.caseName === goal.caseName);
      if (same) return make(goal, i, "same", same);
      const parent = previous.find((p) => isChildTag(goal.caseName, p.caseName));
      if (parent) return make(goal, i, "child", parent);
    }
    if (previous.length === 1 && current.length > 1) return make(goal, i, "child", previous[0]);
    if (goal.caseName && (tagged || previous.length === 0)) return make(goal, i, "new", null);
    if (previous.length === 0) return make(goal, i, "new", null);
    return make(goal, i, "uncertain", null);
  });
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * Structured comparison of the goal states before and after one step.
 * `isLast` decides whether an empty goal list means "proof complete" or just that
 * Lean shows nothing at this point (a case or bullet was finished).
 */
export function compareStates(
  previous: Goal[] | null,
  current: Goal[],
  { from = null, to = 0, isLast = false }: { from?: number | null; to?: number; isLast?: boolean } = {},
): StateTransition {
  const matches = matchGoals(previous, current);
  const certain = !matches.some((m) => m.relation === "uncertain");
  const before = previous ?? [];
  const prevLabel = (g: Goal) => goalLabel(g, before.indexOf(g), before.length);

  const kept = new Set(matches.filter((m) => m.relation === "same").map((m) => m.previous));
  const splitFrom = new Set(matches.filter((m) => m.relation === "child").map((m) => m.previous));
  const vanished = certain ? before.filter((g) => !kept.has(g) && !splitFrom.has(g)) : [];
  // On the first step nothing was created: it's just where the proof starts.
  const created = certain && previous ? matches.filter((m) => m.relation === "child" || m.relation === "new").map((m) => m.label) : [];

  const same = certain ? matches.filter((m) => m.relation === "same") : [];
  const hypothesesAdded = same.flatMap((m) => m.hypothesesAdded);
  const hypothesesRemoved = same.flatMap((m) => m.hypothesesRemoved);
  const targetChanged = same.some((m) => m.targetChanged);
  const workedOnAnother = splitFrom.size > 0 || hypothesesAdded.length > 0 || hypothesesRemoved.length > 0 || targetChanged;

  const closed = workedOnAnother ? [] : vanished.map(prevLabel);
  const hidden = workedOnAnother ? vanished.map(prevLabel) : [];
  const complete = isLast && current.length === 0;

  let kind: TransitionKind;
  if (previous === null) kind = "start";
  else if (complete) kind = "complete";
  else if (!certain) kind = "restructure";
  else if (splitFrom.size > 0 && created.length > 1) kind = "split";
  else if (closed.length > 0) kind = "close";
  else if (matches.some((m) => m.relation === "same" && m.goal.caseName && m.goal.caseName !== m.previous?.caseName)) kind = "focus";
  else if (workedOnAnother || created.length > 0 || hidden.length > 0) kind = "change";
  else kind = "same";

  const summary: string[] = [];
  if (previous === null) {
    summary.push(current.length === 0 ? "Nothing to prove." : `Starting state: ${plural(current.length, "goal")} to prove.`);
  } else if (!certain) {
    summary.push(`Goal structure changed: ${plural(before.length, "goal")} before, ${plural(current.length, "goal")} now.`);
  } else {
    if (kind === "split") {
      const parents = [...splitFrom].map((g) => prevLabel(g!));
      summary.push(`Split ${parents.join(", ")} into ${plural(created.length, "goal")}: ${created.join(", ")}.`);
    } else if (created.length > 0) {
      summary.push(`${created.length === 1 ? "Now showing" : `${created.length} goals now showing:`} ${created.join(", ")}.`);
    }
    const focused = matches.find((m) => m.relation === "same" && m.goal.caseName && m.goal.caseName !== m.previous?.caseName);
    if (focused && kind === "focus") summary.push(`Working on case ${focused.goal.caseName}.`);
    if (closed.length > 0) summary.push(`Closed ${closed.join(", ")}.`);
    if (hidden.length > 0) summary.push(`${hidden.join(", ")} still open, set aside while Lean works on this branch.`);
    if (hypothesesAdded.length === 1) summary.push(`New hypothesis ${hypKey(hypothesesAdded[0])}.`);
    else if (hypothesesAdded.length > 1) summary.push(`${hypothesesAdded.length} new hypotheses.`);
    const removedNames = hypothesesRemoved.flatMap((h) => h.names);
    if (removedNames.length > 0) summary.push(`${removedNames.join(", ")} no longer listed.`);
    if (targetChanged) summary.push("The target changed.");
    if (current.length === 0) {
      summary.push(complete ? "No goals remain: proof complete." : "Nothing left to prove in this branch.");
    } else if (kind === "same") {
      summary.push("The goal state is unchanged.");
    } else if (kind === "split" || kind === "close") {
      summary.push(`${plural(current.length, "goal")} shown.`);
    }
  }

  return {
    from,
    to,
    goalsBefore: before.length,
    goalsAfter: current.length,
    matches,
    created,
    closed,
    hidden,
    hypothesesAdded,
    hypothesesRemoved,
    targetChanged,
    complete,
    certain,
    kind,
    summary,
  };
}

/** Transitions for every step of a trace, step 0 included. */
export function traceTransitions(steps: { goals: Goal[] }[]): StateTransition[] {
  return steps.map((s, i) =>
    compareStates(i === 0 ? null : steps[i - 1].goals, s.goals, {
      from: i === 0 ? null : i - 1,
      to: i,
      isLast: i === steps.length - 1,
    }),
  );
}
