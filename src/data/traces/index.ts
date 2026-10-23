import type { ProofTrace } from "../../types/proof";
import mock from "./mock.json";

// JSON imports widen string unions (viz becomes `string`), so the cast is needed.
// Real traces from scripts/extract-traces.mjs replace mock.json file by file.
export const traces = mock as ProofTrace[];
