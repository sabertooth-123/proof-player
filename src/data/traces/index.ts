import type { ProofTrace } from "../../types/proof";
import mock from "./mock.json";

// Every <id>.json here is written by `npm run traces`. mock.json is only a fallback
// for a checkout where no real trace has been generated yet.
// JSON imports widen string unions (viz becomes `string`), so the casts are needed.
const generated = Object.entries(
  import.meta.glob<ProofTrace>(["./*.json", "!./mock.json"], { eager: true, import: "default" }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, trace]) => trace);

export const traces: ProofTrace[] = generated.length ? generated : (mock as ProofTrace[]);
