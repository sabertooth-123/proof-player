import type { ProofTrace } from "../types/proof";
import { assertTrace } from "./validateTrace";

// Where the Lean API lives (scripts/lean-api.mjs):
//   npm run dev     -> this dev server ("" = same origin, vite.config.ts)
//   live site       -> the public Lean server, from VITE_LEAN_API at build time (.env.production)
// With neither, leanVersion() resolves to null and the app hides the upload button.
// `?? {}` lets the module load outside Vite (the tests run it under plain Node).
const ENV = (import.meta.env ?? {}) as { VITE_LEAN_API?: string; DEV?: boolean };
const API = (ENV.VITE_LEAN_API ?? "").replace(/\/+$/, "");
const ENABLED = Boolean(ENV.DEV) || API !== "";

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
  const attempts = ENV.DEV ? 1 : 2;
  for (let i = 0; i < attempts; i++) {
    const version = await probe();
    if (version) return version;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 15_000));
  }
  return null;
}

/** What went wrong with an upload; decides the heading and the advice shown. */
export type UploadErrorKind = "not-lean" | "network" | "lean" | "layout" | "policy" | "limit" | "server" | "malformed";

export class UploadError extends Error {
  kind: UploadErrorKind;
  source: string; // the uploaded text, so the UI can show the offending line
  constructor(kind: UploadErrorKind, message: string, source = "") {
    super(message);
    this.kind = kind;
    this.source = source;
  }
}

// Older servers send no `kind`; recognise their messages instead.
function kindOf(message: string, status: number): UploadErrorKind {
  if (/^Lean reported errors/.test(message)) return "lean";
  if (/not allowed|origin not allowed|only theorem/.test(message)) return "policy";
  if (/too large|took longer|too many uploads/.test(message) || status === 413 || status === 429) return "limit";
  if (/cannot run lean|failed to start|internal error/.test(message) || status >= 500) return "server";
  return "layout";
}

const KINDS: UploadErrorKind[] = ["not-lean", "network", "lean", "layout", "policy", "limit", "server", "malformed"];

/** Runs the real extractor on a .lean file. Throws an UploadError if anything fails. */
export async function extractLeanFile(file: File): Promise<ProofTrace> {
  if (!/\.lean$/i.test(file.name)) throw new UploadError("not-lean", `${file.name} is not a .lean file`);
  const source = await file.text();
  let res: Response;
  try {
    res = await fetch(`${API || "."}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, source }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new UploadError("network", "couldn't reach the Lean server", source);
  }
  const body = (await res.json().catch(() => ({}))) as { trace?: unknown; error?: string; kind?: string };
  if (!res.ok || !body.trace) {
    const message = body.error ?? `upload failed (HTTP ${res.status})`;
    const kind = KINDS.includes(body.kind as UploadErrorKind) ? (body.kind as UploadErrorKind) : kindOf(message, res.status);
    throw new UploadError(kind, message, source);
  }
  try {
    return assertTrace(body.trace);
  } catch (e) {
    throw new UploadError("malformed", (e as Error).message, source);
  }
}
