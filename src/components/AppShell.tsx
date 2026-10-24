import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProofTrace, Goal } from "../types/proof";
import { traceTransitions } from "../lib/transition";
import { isAutoplaying } from "../lib/playback";
import ProofSelector from "./ProofSelector";
import LeanFileOpener from "./LeanFileOpener";
import CodeViewer from "./CodeViewer";
import PlaybackControls from "./PlaybackControls";
import { GoalPanel } from "./GoalPanel";
import { VisualizationPanel } from "./VisualizationPanel";
import { HowItWorks } from "./HowItWorks";
import RawLeanOutput from "./RawLeanOutput";
import PanelBoundary from "./PanelBoundary";
import ThemeToggle from "./ThemeToggle";
import { PredictFeedback, PredictPrompt, type PredictionResult } from "./PredictPanel";
import { grade, observedChanges, type ChangeKind } from "../lib/predict";

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
  const playing = isAutoplaying(isPlaying, currentStepIndex, selectedTrace.steps.length);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(onNext, PLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, currentStepIndex, onNext]);

  // Predict mode: Next first asks what the tactic will change, then reveals and grades it.
  const [predictMode, setPredictMode] = useState(false);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const togglePlay = () => {
    if (predictMode) return; // autoplay would skip the questions
    setIsPlaying(!playing && currentStepIndex < lastIndex);
  };

  // Any manual action stops autoplay and drops a pending question or old result.
  const stopThen = (action: () => void) => () => {
    setIsPlaying(false);
    setAsking(false);
    setResult(null);
    action();
  };

  const next = () => {
    setIsPlaying(false);
    if (predictMode && currentStepIndex < lastIndex) {
      if (!asking) {
        setResult(null);
        setAsking(true);
        return;
      }
      reveal(null); // Next while asking = skip the question
      return;
    }
    setResult(null);
    onNext();
  };

  const reveal = (predicted: Set<ChangeKind> | null) => {
    const upcoming = transitions[currentStepIndex + 1];
    setAsking(false);
    if (predicted && upcoming) {
      const observed = observedChanges(upcoming);
      const g = observed ? grade(predicted, observed) : null;
      if (g && !g.other) setScore((s) => ({ right: s.right + (g.exact ? 1 : 0), total: s.total + 1 }));
      setResult({ grade: g, summary: upcoming.summary.join(" ") });
    } else {
      setResult(null);
    }
    onNext();
  };

  const togglePredict = () => {
    setIsPlaying(false);
    setAsking(false);
    setResult(null);
    setScore({ right: 0, total: 0 });
    setPredictMode(!predictMode);
  };

  const openUploaded = useCallback(
    (trace: ProofTrace) => {
      setIsPlaying(false);
      setAsking(false);
      setResult(null);
      onAddTrace(trace);
    },
    [onAddTrace],
  );

  const selectTrace = (traceId: string) => {
    setIsPlaying(false);
    setAsking(false);
    setResult(null);
    onSelectTrace(traceId);
  };

  const isComplete = currentStepIndex === lastIndex && currentStep.goals.length === 0;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <div className="app-title__row">
            <h1>
              Proof Player <span>step through a Lean proof one tactic at a time</span>
            </h1>
            <ThemeToggle />
          </div>
          <HowItWorks />
        </div>
        <ProofSelector
          traces={traces}
          selectedTraceId={selectedTrace.id}
          onSelect={selectTrace}
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
                  if (firstBuiltIn) selectTrace(firstBuiltIn.id);
                }}
              />
            }
          />

          <PlaybackControls
            stepIndex={currentStepIndex}
            stepCount={selectedTrace.steps.length}
            isPlaying={playing}
            markers={markers}
            predictMode={predictMode}
            onTogglePredict={togglePredict}
            onTogglePlay={togglePlay}
            onNext={next}
            onPrev={stopThen(onPrev)}
            onReset={stopThen(onReset)}
            onSeek={(i) => stopThen(() => onSeek(i))()}
          />

          {asking && currentStepIndex < lastIndex ? (
            <PredictPrompt
              key={`${selectedTrace.id}:${currentStepIndex}`}
              tactic={selectedTrace.steps[currentStepIndex + 1].tactic}
              onReveal={reveal}
            />
          ) : (
            <div className="step-info">
              <pre className="step-tactic">{currentStep.tactic}</pre>
              {result ? (
                <PredictFeedback result={result} score={score} onDismiss={() => setResult(null)} />
              ) : (
                transition && (
                  <p className={`step-change step-change--${transition.kind}`} aria-live="polite">
                    <span className="step-change__label">What changed</span> {transition.summary.join(" ")}
                    {currentStepIndex === 0 && !playing && (
                      <span className="step-change__hint">
                        {predictMode ? " Press → to predict what the first tactic does." : " Press Play, or → to run the first tactic."}
                      </span>
                    )}
                  </p>
                )
              )}
              {currentStep.explanation ? (
                <p className="step-explanation">{currentStep.explanation}</p>
              ) : (
                <p className="step-explanation step-explanation--none">
                  No explanation written for this step. The goals on the right are exactly what Lean reports.
                </p>
              )}
            </div>
          )}
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
