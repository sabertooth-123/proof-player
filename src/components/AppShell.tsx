
import type { ProofTrace, Goal } from "../types/proof";
import ProofSelector from "./ProofSelector";
import CodeViewer from "./CodeViewer";
import PlaybackControls from "./PlaybackControls";
import { GoalPanel } from "./GoalPanel";
import { VisualizationPanel } from "./VisualizationPanel";

interface AppShellProps {
  traces: ProofTrace[];
  selectedTrace: ProofTrace;
  currentStepIndex: number;
  currentStep: ProofTrace["steps"][number];
  previousGoals: Goal[] | null;
  onSelectTrace: (traceId: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
}

export default function AppShell({
  traces,
  selectedTrace,
  currentStepIndex,
  currentStep,
  previousGoals,
  onSelectTrace,
  onNext,
  onPrev,
  onReset,
}: AppShellProps) {
  const isComplete =
    currentStepIndex === selectedTrace.steps.length - 1 &&
    currentStep.goals.length === 0;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Proof Player</h1>
          <p>Explore a proof one tactic at a time.</p>
        </div>
        <ProofSelector
          traces={traces}
          selectedTraceId={selectedTrace.id}
          onSelect={onSelectTrace}
        />
      </header>

      <div className="player-layout">
        <CodeViewer
          source={selectedTrace.source}
          activeLine={currentStep.line}
        />

        <div className="right-panels">
          <section className="panel">
  <h2>Current Goals</h2>
  <GoalPanel
    goals={currentStep.goals}
    previous={previousGoals}
    isFinal={isComplete}
  />
  <p className="provenance">
    Goals extracted from Lean {selectedTrace.provenance.lean}
  </p>
</section>

<section className="panel">
  <h2>Visualization</h2>
  <VisualizationPanel
    kind={selectedTrace.viz}
    goals={currentStep.goals}
    previous={previousGoals}
  />
</section>
        </div>
      </div>

      <PlaybackControls
        stepIndex={currentStepIndex}
        stepCount={selectedTrace.steps.length}
        onNext={onNext}
        onPrev={onPrev}
        onReset={onReset}
      />

      <p className="step-explanation">{currentStep.explanation}</p>
    </main>
  );
}
