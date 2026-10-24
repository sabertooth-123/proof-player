import { useState } from "react";
import { CHANGE_OPTIONS, changeLabel, type ChangeKind, type Grade } from "../lib/predict";

export interface PredictionResult {
  grade: Grade | null; // null: the step couldn't be compared reliably, so it isn't graded
  summary: string; // the "What changed" text for the step
}

interface Props {
  tactic: string; // the tactic about to run
  onReveal: (predicted: Set<ChangeKind> | null) => void; // null = skipped
}

/** Asks what the next tactic will change, before it runs. */
export function PredictPrompt({ tactic, onReveal }: Props) {
  const [picked, setPicked] = useState<Set<ChangeKind>>(new Set());
  const toggle = (k: ChangeKind) => {
    const next = new Set(picked);
    if (next.has(k)) next.delete(k);
    else {
      // "Nothing changes" excludes the others, and the others exclude it.
      if (k === "unchanged") next.clear();
      else next.delete("unchanged");
      next.add(k);
    }
    setPicked(next);
  };

  return (
    <section className="predict" aria-label="Predict the next state">
      <p className="predict__question">
        What will <code>{tactic}</code> change? <span>Pick any that apply.</span>
      </p>
      <div className="predict__options" role="group" aria-label="Expected changes">
        {CHANGE_OPTIONS.map((o) => (
          <label key={o.kind} className={picked.has(o.kind) ? "is-picked" : undefined}>
            <input type="checkbox" checked={picked.has(o.kind)} onChange={() => toggle(o.kind)} />
            {o.label}
          </label>
        ))}
      </div>
      <div className="predict__actions">
        <button type="button" className="predict__reveal" disabled={picked.size === 0} onClick={() => onReveal(picked)}>
          Reveal
        </button>
        <button type="button" onClick={() => onReveal(null)}>
          Skip
        </button>
      </div>
    </section>
  );
}

/** Shows how the prediction compares with what Lean's states actually show. */
export function PredictFeedback({ result, score, onDismiss }: { result: PredictionResult; score: { right: number; total: number }; onDismiss: () => void }) {
  const g = result.grade;
  let verdict: string;
  if (!g) verdict = "Not graded: these two states couldn't be compared reliably.";
  else if (g.other) verdict = "None of the options describe this step.";
  else if (g.exact) verdict = "Spot on.";
  else if (g.right.length > 0) verdict = "Partly right.";
  else verdict = "Not this time.";

  return (
    <section className={`predict predict--result${g?.exact ? " is-exact" : ""}`} aria-live="polite" aria-label="Prediction result">
      <div className="predict__head">
        <strong>{verdict}</strong>
        <span className="predict__score">{score.right} / {score.total} right</span>
        <button type="button" onClick={onDismiss} aria-label="Hide prediction result">✕</button>
      </div>
      {g && !g.other && (
        <ul className="predict__grades">
          {g.right.map((k) => <li key={k} className="is-right">✓ {changeLabel(k)}</li>)}
          {g.wrong.map((k) => <li key={k} className="is-wrong">✗ {changeLabel(k)}, but it didn't</li>)}
          {g.missed.map((k) => <li key={k} className="is-missed">• Also: {changeLabel(k).toLowerCase()}</li>)}
        </ul>
      )}
      <p className="predict__actual">Lean's states show: {result.summary}</p>
    </section>
  );
}
