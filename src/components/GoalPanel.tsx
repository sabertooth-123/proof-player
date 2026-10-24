import { useState } from "react";
import type { Goal, Hypothesis } from "../types/proof";
import { hypKey, isAdded, matchGoals } from "../lib/transition";
import "../viz/viz.css";

interface Props {
  goals: Goal[];
  previous: Goal[] | null;
  /** True only on the last step. An empty goal list can also mean one branch
   *  closed (e.g. the nil case), so "Proof complete" needs this flag. */
  isFinal?: boolean;
}

/** Long hypothesis lists show only the newest few until expanded. */
const COLLAPSE_AFTER = 8;
const SHOW_WHEN_COLLAPSED = 6;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="pp-copy"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          },
          () => {},
        );
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function HypLine({ h, className }: { h: Hypothesis; className?: string }) {
  return (
    <li className={className}>
      <span className="pp-names">{h.names.join(" ")}</span>
      <span>:</span>
      <code>{h.type}</code>
      <CopyButton text={hypKey(h)} label={`hypothesis ${h.names.join(" ")}`} />
    </li>
  );
}

export function GoalPanel({ goals, previous, isFinal = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (goals.length === 0) {
    return (
      <section className="pp-panel" aria-live="polite" aria-label="Proof goals">
        <div className="pp-done">{isFinal ? "✓ Proof complete" : "✓ Goal closed"}</div>
        {!isFinal && <p className="pp-muted pp-note">Lean shows no goals inside this branch; other cases continue in later steps.</p>}
      </section>
    );
  }

  // Same comparison the transition summary uses, so highlights and summary agree.
  const matches = matchGoals(previous, goals);

  return (
    <section className="pp-panel" aria-live="polite" aria-label="Proof goals">
      <div className="pp-head">
        <span className="pp-muted">{goals.length === 1 ? "1 goal left" : `${goals.length} goals left`}</span>
      </div>
      {matches.map((m, i) => {
        const { goal } = m;
        const traced = m.relation === "same" || m.relation === "child";
        const hyps = goal.hypotheses;
        const collapsible = hyps.length > COLLAPSE_AFTER && !expanded;
        const shown = collapsible ? hyps.slice(-SHOW_WHEN_COLLAPSED) : hyps;
        return (
          <article
            className={`pp-goal${i === 0 && goals.length > 1 ? " pp-goal-current" : ""}`}
            key={`${goal.caseName ?? "main"}-${i}`}
            aria-label={goal.caseName ? `Goal, case ${goal.caseName}` : "Goal"}
          >
            <div className="pp-goal-head">
              {goal.caseName && <span className="pp-case">case {goal.caseName}</span>}
              {i === 0 && goals.length > 1 && <span className="pp-badge" title="Lean applies the next tactic to the first goal">current</span>}
              {m.relation === "child" && <span className="pp-badge pp-badge-new">new</span>}
            </div>
            <ul className="pp-hyps">
              {collapsible && (
                <li className="pp-more">
                  <button type="button" onClick={() => setExpanded(true)}>
                    Show {hyps.length - shown.length} earlier hypotheses
                  </button>
                </li>
              )}
              {shown.map((h, j) => (
                <HypLine key={`${j}-${hypKey(h)}`} h={h} className={traced && isAdded(h, m.hypothesesAdded) ? "pp-new" : undefined} />
              ))}
              {traced &&
                m.hypothesesRemoved.map((h, j) => <HypLine key={`x${j}-${hypKey(h)}`} h={h} className="pp-removed" />)}
              {expanded && hyps.length > COLLAPSE_AFTER && (
                <li className="pp-more">
                  <button type="button" onClick={() => setExpanded(false)}>Show fewer</button>
                </li>
              )}
            </ul>
            <div className={`pp-target${traced && m.targetChanged ? " pp-new" : ""}`}>
              <span className="pp-turnstile">⊢</span>
              <code>{goal.target}</code>
              <CopyButton text={goal.target} label="target" />
            </div>
          </article>
        );
      })}
    </section>
  );
}
