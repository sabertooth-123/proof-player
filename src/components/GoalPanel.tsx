import type { Goal } from "../types/proof";
import { diffGoal, findPrevGoal, hypKey } from "./goalDiff";
import "../viz/viz.css";

interface Props {
  goals: Goal[];
  previous: Goal[] | null;
  /** True only on the last step. An empty goal list can also mean one branch
   *  closed (e.g. the nil case), so "Proof complete" needs this flag. */
  isFinal?: boolean;
}

export function GoalPanel({ goals, previous, isFinal = false }: Props) {
  if (goals.length === 0) {
    return (
      <section className="pp-panel" aria-live="polite" aria-label="Proof goals">
        <div className="pp-done">{isFinal ? "✓ Proof complete" : "✓ Goal closed"}</div>
      </section>
    );
  }
  return (
    <section className="pp-panel" aria-live="polite" aria-label="Proof goals">
      <div className="pp-head">
        <h2>Goals</h2>
        <span className="pp-muted">{goals.length === 1 ? "1 goal left" : `${goals.length} goals left`}</span>
      </div>
      {goals.map((goal, i) => {
        const diff = diffGoal(goal, findPrevGoal(goal, i, previous));
        return (
          <article className="pp-goal" key={`${goal.caseName ?? "main"}-${i}`}>
            {goal.caseName && <span className="pp-case">case {goal.caseName}</span>}
            <ul className="pp-hyps">
              {goal.hypotheses.map((h, j) => (
                <li key={`${j}-${hypKey(h)}`} className={diff.added.has(hypKey(h)) ? "pp-new" : undefined}>
                  <span className="pp-names">{h.names.join(" ")}</span>
                  <span>:</span>
                  <code>{h.type}</code>
                </li>
              ))}
              {diff.removed.map((h, j) => (
                <li key={`x${j}-${hypKey(h)}`} className="pp-removed">
                  <span className="pp-names">{h.names.join(" ")}</span>
                  <span>:</span>
                  <code>{h.type}</code>
                </li>
              ))}
            </ul>
            <div className={`pp-target${diff.targetChanged ? " pp-new" : ""}`}>
              <span className="pp-turnstile">⊢</span>
              <code>{goal.target}</code>
            </div>
          </article>
        );
      })}
    </section>
  );
}
