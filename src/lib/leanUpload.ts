import type { ProofTrace } from "../types/proof";

// Where the Lean API lives (scripts/lean-api.mjs):
//   npm run dev     -> this dev server ("" = same origin, vite.config.ts)
//   live site       -> the public Lean server, from VITE_LEAN_API at build time (.env.production)
// With neither, leanVersion() resolves to null and the app hides the upload button.
const API = (import.meta.env.VITE_LEAN_API ?? "").replace(/\/+$/, "");
const ENABLED = import.meta.env.DEV || API !== "";

async function probe(): Promise<string | null> {
  try {
    const res = await fetch(`${API || "."}/api/lean`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) return null;
    const body = (await res.json()) as { available?: boolean; version?: string };
    return body.available ? (body.version ?? "unknown") : null;
  } catch {
    return null;
  }
}

/**
 * Lean version if a Lean server is reachable, otherwise null. Never throws.
 * The live server is a tunnel to a laptop (npm run live): it's either up or not, so one
 * retry covers a slow first connection without filling the console when it's off.
 */
export async function leanVersion(): Promise<string | null> {
  if (!ENABLED) return null;
  const attempts = import.meta.env.DEV ? 1 : 2;
  for (let i = 0; i < attempts; i++) {
    const version = await probe();
    if (version) return version;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 15_000));
  }
  return null;
}

/** Runs the real extractor on a .lean file. Throws an Error with Lean's message if it fails. */
export async function extractLeanFile(file: File): Promise<ProofTrace> {
  if (!/\.lean$/i.test(file.name)) throw new Error(`${file.name} is not a .lean file`);
  let res: Response;
  try {
    res = await fetch(`${API || "."}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, source: await file.text() }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error("couldn't reach the Lean server; try again in a moment");
  }
  const body = (await res.json().catch(() => ({}))) as { trace?: ProofTrace; error?: string };
  if (!res.ok || !body.trace) throw new Error(body.error ?? `upload failed (HTTP ${res.status})`);
  return body.trace;
}
