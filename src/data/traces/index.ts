import type { ProofTrace } from "../../types/proof";
import manifest from "../../../samples/index.json";
import mock from "./mock.json";

// Every <id>.json here is written by `npm run traces`. mock.json is only a fallback
// for a checkout where no real trace has been generated yet.
// JSON imports widen string unions (viz becomes `string`), so the casts are needed.
// Order follows samples/index.json, so its first entry is what the app opens on.
const order = manifest.map((m) => m.id);
const rank = (t: ProofTrace) => (order.includes(t.id) ? order.indexOf(t.id) : order.length);
const generated = Object.values(
  import.meta.glob<ProofTrace>(["./*.json", "!./mock.json"], { eager: true, import: "default" }),
).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));

export const traces: ProofTrace[] = generated.length ? generated : (mock as ProofTrace[]);
