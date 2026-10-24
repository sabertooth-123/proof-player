
import type { ProofTrace, Goal } from "../types/proof";
import ProofSelector from "./ProofSelector";
import CodeViewer from "./CodeViewer";
import PlaybackControls from "./PlaybackControls";
import { GoalPanel } from "./GoalPanel";
import { VisualizationPanel } from "./VisualizationPanel";
import { useEffect, useState } from "react";

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
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
  if (!isPlaying) return;

  if (currentStepIndex >= selectedTrace.steps.length - 1) {
    setIsPlaying(false);
    return;
  }

  const timer = window.setTimeout(() => {
    onNext();
  }, 1000);

  return () => window.clearTimeout(timer);
}, [
  isPlaying,
  currentStepIndex,
  selectedTrace.steps.length,
  onNext,
]);

const togglePlay = () => {
  if (isPlaying) {
    setIsPlaying(false);
  } else if (currentStepIndex < selectedTrace.steps.length - 1) {
    setIsPlaying(true);
  }
};

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
          onSelect={(traceId) => {
  setIsPlaying(false);
  onSelectTrace(traceId);
}}
        />
      </header>

{/* TODO: Render <HowItWorks /> here after Vineet's PR is merged. */}

      <div className="player-layout">
        <CodeViewer
          source={selectedTrace.source}
          activeLine={currentStep.line}
        />

        <div className="right-panels">
  <div>
    <GoalPanel
      goals={currentStep.goals}
      previous={previousGoals}
      isFinal={isComplete}
    />
    <p className="provenance">
      Goals extracted from Lean {selectedTrace.provenance.lean}
    </p>
  </div>

  <VisualizationPanel
    kind={selectedTrace.viz}
    goals={currentStep.goals}
    previous={previousGoals}
  />
</div>

      </div>

     <PlaybackControls
  stepIndex={currentStepIndex}
  stepCount={selectedTrace.steps.length}
  isPlaying={isPlaying}
  onTogglePlay={togglePlay}
  onNext={() => {
    setIsPlaying(false);
    onNext();
  }}
  onPrev={() => {
    setIsPlaying(false);
    onPrev();
  }}
  onReset={() => {
    setIsPlaying(false);
    onReset();
  }}
/>

      <pre className="step-tactic">
  {currentStep.tactic}
</pre>
<p className="step-explanation">{currentStep.explanation}</p>
    </main>
  );
}
