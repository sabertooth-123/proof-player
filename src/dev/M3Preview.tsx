// DEV ONLY. Never imported by App.tsx / main.tsx; opened at /dev.html while `npm run dev`.
// Lets M3 look at both panels on the real traces without waiting for M2's player.
import { useState } from "react";
import { GoalPanel } from "../components/GoalPanel";
import { VisualizationPanel } from "../components/VisualizationPanel";
import { HowItWorks } from "../components/HowItWorks";
import { traces } from "../data/traces";

const card = { padding: 20, border: "1px solid #293650", borderRadius: 14, background: "#111827" };

export function M3Preview() {
  const [t, setT] = useState(0);
  const [i, setI] = useState(0);
  const trace = traces[t];
  const step = trace.steps[i];
  const prev = i > 0 ? trace.steps[i - 1] : null;
  const last = trace.steps.length - 1;
  return (
    <div style={{ maxWidth: 760, margin: "24px auto", display: "grid", gap: 12, padding: 12, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={t} onChange={(e) => { setT(Number(e.target.value)); setI(0); }}>
          {traces.map((x, k) => <option key={x.id} value={k}>{x.title} ({x.viz})</option>)}
        </select>
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>Prev</button>
        <button onClick={() => setI((n) => Math.min(last, n + 1))} disabled={i === last}>Next</button>
        <span>step {i} / {last}</span>
      </div>
      <code style={{ fontSize: 13 }}>line {step.line}: {step.tactic}</code>
      <HowItWorks />
      <div style={card}>
        <GoalPanel goals={step.goals} previous={prev?.goals ?? null} isFinal={i === last} />
      </div>
      <div style={card}>
        <VisualizationPanel kind={trace.viz} goals={step.goals} previous={prev?.goals ?? null} />
      </div>
    </div>
  );
}
