import { useCallback, useEffect, useState } from "react";
import type { ProofTrace, Goal } from "../types/proof";
import ProofSelector from "./ProofSelector";
import LeanFileOpener from "./LeanFileOpener";
import CodeViewer from "./CodeViewer";
import PlaybackControls from "./PlaybackControls";
import { GoalPanel } from "./GoalPanel";
import { VisualizationPanel } from "./VisualizationPanel";
import { HowItWorks } from "./HowItWorks";
import RawLeanOutput from "./RawLeanOutput";

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
  onAddTrace: (trace: ProofTrace) => void;
}

const PLAY_INTERVAL_MS = 1000;

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
  onAddTrace,
}: AppShellProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const lastIndex = selectedTrace.steps.length - 1;

  // Autoplay: one step per tick. Reaching the last step stops it by itself.
  const playing = isPlaying && currentStepIndex < lastIndex;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(onNext, PLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, currentStepIndex, onNext]);

  const togglePlay = () => setIsPlaying(!playing && currentStepIndex < lastIndex);

  // Any manual action stops autoplay.
  const stopThen = (action: () => void) => () => {
    setIsPlaying(false);
    action();
  };

  const openUploaded = useCallback(
    (trace: ProofTrace) => {
      setIsPlaying(false);
      onAddTrace(trace);
    },
    [onAddTrace],
  );

  const isComplete = currentStepIndex === lastIndex && currentStep.goals.length === 0;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <h1>
            Proof Player <span>step through a Lean proof one tactic at a time</span>
          </h1>
          <HowItWorks />
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

      <div className="player-layout">
        <div className="left-column">
          <CodeViewer
            source={selectedTrace.source}
            activeLine={currentStep.line}
            headerAction={<LeanFileOpener onLoaded={openUploaded} />}
          />

          <PlaybackControls
            stepIndex={currentStepIndex}
            stepCount={selectedTrace.steps.length}
            isPlaying={playing}
            onTogglePlay={togglePlay}
            onNext={stopThen(onNext)}
            onPrev={stopThen(onPrev)}
            onReset={stopThen(onReset)}
          />

          <div className="step-info">
            <pre className="step-tactic">{currentStep.tactic}</pre>
            {currentStep.explanation ? (
              <p className="step-explanation">{currentStep.explanation}</p>
            ) : (
              <p className="step-explanation step-explanation--none">
                No explanation written for this step. The goals on the right are exactly what Lean reports.
              </p>
            )}
          </div>
        </div>

        <div className={`right-panels right-panels--${selectedTrace.viz}`}>
          <section className="panel">
            <div className="panel-head">
              <h2>{showRaw ? "Raw Lean output" : "Goals"}</h2>
              <button
                type="button"
                className="raw-toggle"
                aria-pressed={showRaw}
                onClick={() => setShowRaw(!showRaw)}
              >
                {showRaw ? "Show goals" : "Show raw Lean output"}
              </button>
            </div>
            {showRaw ? (
              <RawLeanOutput raw={currentStep.raw} line={currentStep.line} />
            ) : (
              <GoalPanel goals={currentStep.goals} previous={previousGoals} isFinal={isComplete} />
            )}
            <p className="provenance">Goals extracted from Lean {selectedTrace.provenance.lean}</p>
          </section>

          <section className="panel panel--viz">
            <h2>Visualization</h2>
            <VisualizationPanel kind={selectedTrace.viz} goals={currentStep.goals} previous={previousGoals} />
          </section>
        </div>
      </div>
    </main>
  );
}
