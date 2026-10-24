import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProofTrace, Goal } from "../types/proof";
import { traceTransitions } from "../lib/transition";
import ProofSelector from "./ProofSelector";
import LeanFileOpener from "./LeanFileOpener";
import CodeViewer from "./CodeViewer";
import PlaybackControls from "./PlaybackControls";
import { GoalPanel } from "./GoalPanel";
import { VisualizationPanel } from "./VisualizationPanel";
import { HowItWorks } from "./HowItWorks";
import RawLeanOutput from "./RawLeanOutput";
import PanelBoundary from "./PanelBoundary";

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
  onSeek: (index: number) => void;
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
  onSeek,
  onAddTrace,
}: AppShellProps) {
  // What each step changed, computed once per proof from Lean's recorded states.
  const transitions = useMemo(() => traceTransitions(selectedTrace.steps), [selectedTrace]);
  const transition = transitions[currentStepIndex];
  const markers = useMemo(
    () => transitions.map((t, i) => ({ kind: t.kind, label: `${selectedTrace.steps[i].tactic}. ${t.summary.join(" ")}` })),
    [transitions, selectedTrace],
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const goalsRef = useRef<HTMLElement>(null);

  // When the goals don't fit, keep the bottom in view: that's where the newest
  // hypothesis and the ⊢ target are.
  useEffect(() => {
    const el = goalsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selectedTrace.id, currentStepIndex, showRaw]);
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
            headerAction={
              <LeanFileOpener
                onLoaded={openUploaded}
                onBackToExamples={() => {
                  const firstBuiltIn = traces.find((t) => !t.id.startsWith("upload-"));
                  if (firstBuiltIn) {
                    setIsPlaying(false);
                    onSelectTrace(firstBuiltIn.id);
                  }
                }}
              />
            }
          />

          <PlaybackControls
            stepIndex={currentStepIndex}
            stepCount={selectedTrace.steps.length}
            isPlaying={playing}
            markers={markers}
            onTogglePlay={togglePlay}
            onNext={stopThen(onNext)}
            onPrev={stopThen(onPrev)}
            onReset={stopThen(onReset)}
            onSeek={(i) => {
              setIsPlaying(false);
              onSeek(i);
            }}
          />

          <div className="step-info">
            <pre className="step-tactic">{currentStep.tactic}</pre>
            {transition && (
              <p className={`step-change step-change--${transition.kind}`} aria-live="polite">
                <span className="step-change__label">What changed</span> {transition.summary.join(" ")}
              </p>
            )}
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
          <section className="panel" ref={goalsRef}>
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
              <PanelBoundary name="goal panel" resetKey={`${selectedTrace.id}:${currentStepIndex}`}>
                <GoalPanel key={selectedTrace.id} goals={currentStep.goals} previous={previousGoals} isFinal={isComplete} />
              </PanelBoundary>
            )}
            <p className="provenance">Goals extracted from Lean {selectedTrace.provenance.lean}</p>
          </section>

          <section className="panel panel--viz">
            <h2>Visualization</h2>
            <PanelBoundary name="visualization" resetKey={`${selectedTrace.id}:${currentStepIndex}`}>
              <VisualizationPanel kind={selectedTrace.viz} goals={currentStep.goals} previous={previousGoals} />
            </PanelBoundary>
          </section>
        </div>
      </div>
    </main>
  );
}
