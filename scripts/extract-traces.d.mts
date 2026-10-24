// Types for the parts of extract-traces.mjs used from TypeScript (vite.config.ts, tests).
import type { Goal, ProofStep, ProofTrace, VizKind } from "../src/types/proof.ts";

export class ExtractError extends Error {
  detail: string;
  constructor(message: string, detail?: string);
}

export interface SampleMeta {
  id: string;
  title: string;
  description: string;
  viz: VizKind;
}

export function instrument(source: string): {
  text: string;
  steps: { origLine: number; tactic: string; instrLine: number; slot: number }[];
  origOf: number[];
};
export function leanVersion(): string;
export function parseGoals(data: string): Goal[];
export function buildTrace(
  meta: SampleMeta,
  source: string,
  version: string,
  today: string,
  options?: { explanations?: string[] | null; explanationsPath?: string; timeoutMs?: number },
): ProofTrace;
export function guessViz(steps: ProofStep[]): VizKind;
export function theoremName(source: string): string | null;
