import type { DeriveViz, Goal, VizKind } from "../types/proof";
import { deriveGoals } from "../viz/deriveGoals";
import { deriveGraph } from "../viz/deriveGraph";
import { deriveList } from "../viz/deriveList";
import { GoalChips } from "../viz/GoalChips";
import { GraphView } from "../viz/GraphView";
import { ListView } from "../viz/ListView";
import "../viz/viz.css";

const DERIVERS: Record<VizKind, DeriveViz> = { list: deriveList, graph: deriveGraph, goal: deriveGoals };
const TITLES: Record<VizKind, string> = { list: "List", graph: "Graph", goal: "Open goals" };

interface Props { kind: VizKind; goals: Goal[]; previous: Goal[] | null }

// Only goals go in. There is deliberately no step index here.
export function VisualizationPanel({ kind, goals, previous }: Props) {
  const frame = DERIVERS[kind](goals, previous);
  return (
    <section className="pp-panel" aria-label="Visualization">
      <div className="pp-head">
        <h2>{TITLES[kind]}</h2>
        {goals.length === 0 && <span className="pp-muted">Goal closed</span>}
      </div>
      {kind === "list" && <ListView items={frame.items ?? []} />}
      {kind === "goal" && <GoalChips items={frame.items ?? []} />}
      {kind === "graph" && <GraphView nodes={frame.nodes ?? []} edges={frame.edges ?? []} />}
    </section>
  );
}
