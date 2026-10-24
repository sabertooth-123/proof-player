import { useCallback, useMemo, useState } from "react";
import { traces as builtIn } from "../data/traces";
import type { PlayerState, ProofTrace } from "../types/proof";

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

  const next = useCallback(() => {
    setState((previous) => {
      const trace = traces.find((item) => item.id === previous.traceId);
      const lastIndex = Math.max(0, (trace?.steps.length ?? 1) - 1);

      return {
        ...previous,
        stepIndex: Math.min(previous.stepIndex + 1, lastIndex),
      };
    });
  }, [traces]);

  const prev = useCallback(() => {
    setState((previous) => ({
      ...previous,
      stepIndex: Math.max(0, previous.stepIndex - 1),
    }));
  }, []);

  const reset = useCallback(() => {
    setState((previous) => ({ ...previous, stepIndex: 0 }));
  }, []);

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
    selectTrace,
    addTrace,
  };
}
