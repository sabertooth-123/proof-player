import type { DeriveViz, Goal, VizKind } from "../types/proof";
import { deriveGoals } from "../viz/deriveGoals";
import { deriveGraph } from "../viz/deriveGraph";
import { deriveList } from "../viz/deriveList";
import { GoalChips } from "../viz/GoalChips";
import { GraphView } from "../viz/GraphView";
import { ListView } from "../viz/ListView";
import "../viz/viz.css";

const DERIVERS: Record<VizKind, DeriveViz> = { list: deriveList, graph: deriveGraph, goal: deriveGoals };
const TITLES: Record<VizKind, string> = { list: "List view", graph: "Graph view", goal: "Open goals" };
const HOW: Record<VizKind, string> = {
  list: "Boxes are the elements of the list literals in the goal: left of = on top, right of = below.",
  graph: "Edges are the (a, b) pairs in the hypotheses; the filled node is where the target's path starts now.",
  goal: "One chip per goal Lean reports; chips appear when a goal splits and get a ✓ when closed.",
};

interface Props { kind: VizKind; goals: Goal[]; previous: Goal[] | null }

// Only goals go in. There is deliberately no step index here.
export function VisualizationPanel({ kind, goals, previous }: Props) {
  const frame = DERIVERS[kind](goals, previous);
  // If this state doesn't contain the structure the picture needs, say so and show
  // the open goals instead of drawing something misleading.
  const unsupported =
    goals.length > 0 &&
    ((kind === "list" && (frame.items ?? []).length === 0) || (kind === "graph" && (frame.nodes ?? []).length === 0));
  const shown: VizKind = unsupported ? "goal" : kind;
  const fallback = unsupported ? deriveGoals(goals, previous) : frame;

  return (
    <section className="pp-panel" aria-label="Visualization">
      <div className="pp-head">
        <span className="pp-kind" title={HOW[shown]}>{TITLES[shown]}</span>
        {goals.length === 0 && <span className="pp-muted">Goal closed</span>}
      </div>
      {unsupported && (
        <p className="pp-muted pp-fallback">
          Showing open goals: this state doesn't contain {kind === "list" ? "a list literal" : "any (a, b) pairs"} to draw.
        </p>
      )}
      {shown === "list" && <ListView items={fallback.items ?? []} />}
      {shown === "goal" && <GoalChips items={fallback.items ?? []} />}
      {shown === "graph" && <GraphView nodes={fallback.nodes ?? []} edges={fallback.edges ?? []} />}
    </section>
  );
}
