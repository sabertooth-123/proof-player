import "../viz/viz.css";

const STEPS: { label: string; mono?: string }[] = [
  { label: "Lean proof" },
  { mono: "trace_state", label: " after every tactic" },
  { label: "real goals from ", mono: "lean --json" },
  { label: "picture computed from the goal" },
];

/** One muted line: how a proof becomes the picture. No props. */
export function HowItWorks() {
  return (
    <nav className="pp-how" aria-label="How Proof Player works">
      <ol>
        {STEPS.flatMap((step, i) => {
          const box = (
            <li key={`box-${i}`}>
              {step.mono && i === 1 && <span className="pp-how-mono">{step.mono}</span>}
              {step.label}
              {step.mono && i === 2 && <span className="pp-how-mono">{step.mono}</span>}
            </li>
          );
          return i < STEPS.length - 1
            ? [box, <li key={`arrow-${i}`} className="pp-how-arrow" aria-hidden="true">→</li>]
            : [box];
        })}
      </ol>
    </nav>
  );
}
