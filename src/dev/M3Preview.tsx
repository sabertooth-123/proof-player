// Temporary harness: render <M3Preview /> from main.tsx to see M3's panels
// before M2's player exists. Delete (or keep out of the build) once integrated.
import { useState } from "react";
import { GoalPanel } from "../components/GoalPanel";
import { VisualizationPanel } from "../components/VisualizationPanel";
import type { Goal, VizKind } from "../types/proof";
import { mockGoal, mockGraph, mockList } from "./mockGoals";

const SETS: Record<VizKind, Goal[][]> = { list: mockList, goal: mockGoal, graph: mockGraph };

export function M3Preview() {
  const [kind, setKind] = useState<VizKind>("list");
  const [i, setI] = useState(0);
  const steps = SETS[kind];
  const prev = i > 0 ? steps[i - 1] : null;
  return (
    <div style={{ maxWidth: 760, margin: "24px auto", display: "grid", gap: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {(["list", "goal", "graph"] as VizKind[]).map((k) => (
          <button key={k} onClick={() => { setKind(k); setI(0); }} disabled={k === kind}>{k}</button>
        ))}
        <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>Prev</button>
        <button onClick={() => setI((n) => Math.min(steps.length - 1, n + 1))} disabled={i === steps.length - 1}>Next</button>
        <span>step {i + 1} / {steps.length}</span>
      </div>
      <GoalPanel goals={steps[i]} previous={prev} isFinal={i === steps.length - 1} />
      <VisualizationPanel kind={kind} goals={steps[i]} previous={prev} />
    </div>
  );
}
