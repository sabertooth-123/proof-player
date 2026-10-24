import type { ProofTrace } from "../types/proof";

// Talks to the dev server's Lean endpoints (vite.config.ts). On the static site they
// don't exist, so leanVersion() resolves to null and the app hides the upload button.

/** Lean version if this server can run Lean, otherwise null. Never throws. */
export async function leanVersion(): Promise<string | null> {
  // The endpoints exist only under `npm run dev`; don't probe (and log a 404) on the static site.
  if (!import.meta.env.DEV) return null;
  try {
    const res = await fetch("./api/lean");
    if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) return null;
    const body = (await res.json()) as { available?: boolean; version?: string };
    return body.available ? (body.version ?? "unknown") : null;
  } catch {
    return null;
  }
}

/** Runs the real extractor on a .lean file. Throws an Error with Lean's message if it fails. */
export async function extractLeanFile(file: File): Promise<ProofTrace> {
  if (!/\.lean$/i.test(file.name)) throw new Error(`${file.name} is not a .lean file`);
  const res = await fetch("./api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, source: await file.text() }),
  });
  const body = (await res.json().catch(() => ({}))) as { trace?: ProofTrace; error?: string };
  if (!res.ok || !body.trace) throw new Error(body.error ?? `upload failed (HTTP ${res.status})`);
  return body.trace;
}
