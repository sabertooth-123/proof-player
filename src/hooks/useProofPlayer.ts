import { useCallback, useMemo, useState } from "react";
import { traces as builtIn } from "../data/traces";
import type { PlayerState, ProofTrace } from "../types/proof";
import { clampStep } from "../lib/playback";

export function useProofPlayer() {
  // Proofs opened from a .lean file this session (dev server only), newest first.
  const [uploaded, setUploaded] = useState<ProofTrace[]>([]);
  const traces = useMemo(() => [...uploaded, ...builtIn], [uploaded]);

  const [state, setState] = useState<PlayerState>(() => ({
    traceId: builtIn[0]?.id ?? "",
    stepIndex: 0,
  }));

  const selectedTrace: ProofTrace | undefined = traces.find(
    (trace) => trace.id === state.traceId,
  );

  const stepCount = selectedTrace?.steps.length ?? 0;
  const currentStep = selectedTrace?.steps[state.stepIndex];
  const previousStep =
    state.stepIndex > 0
      ? selectedTrace?.steps[state.stepIndex - 1]
      : undefined;

  /** Moves to `to(current index)`, clamped to the selected trace. */
  const move = useCallback((to: (index: number) => number) => {
    setState((previous) => {
      const count = traces.find((item) => item.id === previous.traceId)?.steps.length ?? 1;
      return { ...previous, stepIndex: clampStep(to(previous.stepIndex), count) };
    });
  }, [traces]);

  const next = useCallback(() => move((i) => i + 1), [move]);
  const prev = useCallback(() => move((i) => i - 1), [move]);
  const reset = useCallback(() => move(() => 0), [move]);
  /** Jump straight to a step (timeline click, End key). */
  const seek = useCallback((index: number) => move(() => index), [move]);

  const selectTrace = useCallback((traceId: string) => {
    const exists = traces.some((trace) => trace.id === traceId);
    if (!exists) return;

    setState({ traceId, stepIndex: 0 });
  }, [traces]);

  /** Adds a proof extracted from an uploaded file and opens it at step 1. */
  const addTrace = useCallback((trace: ProofTrace) => {
    setUploaded((previous) => [trace, ...previous]);
    setState({ traceId: trace.id, stepIndex: 0 });
  }, []);

  return {
    state,
    traces,
    selectedTrace,
    currentStep,
    previousStep,
    stepCount,
    next,
    prev,
    reset,
    seek,
    selectTrace,
    addTrace,
  };
}
