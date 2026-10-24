// HTTP API that turns an uploaded .lean file into a ProofTrace with the real extractor.
// Used by two servers:
//   - vite.config.ts (npm run dev): local, trusted, same origin
//   - lean-server/server.mjs (Hugging Face Space): public, so `strict` checks are on
//
//   GET  /api/lean     -> { available, version }
//   POST /api/extract  -> body { name, source }; 200 { trace } | 4xx/5xx { error }

import { buildTrace, ExtractError, guessViz, leanVersion, theoremName } from "./extract-traces.mjs";

// Top-level commands a public upload may use. Anything else (#eval, import, macro, IO, ...)
// could run code on the server, and the player doesn't need it.
const ALLOWED_COMMANDS = /^(@\[simp\]\s*)?(theorem|lemma|example|def|abbrev|inductive|structure|namespace|end|section|open|variable|universe|set_option|private|protected|noncomputable)\b/;
const FORBIDDEN = [
  [/#[a-z_]/i, "`#` commands (#eval, #print, ...)"],
  [/\bimport\b/, "`import` (only core Lean is available)"],
  [/\b(run_cmd|run_elab|run_meta|run_tac)\b/, "run_cmd / run_elab"],
  [/\b(macro|macro_rules|syntax|elab|elab_rules|notation|infix|infixl|infixr|prefix|postfix)\b/, "custom syntax"],
  [/\b(initialize|builtin_initialize|unsafe|implemented_by|extern|export)\b/, "unsafe or native code"],
  [/\b(IO|EIO|BaseIO|System|Process|FilePath|ST)\b/, "IO"],
  [/\bset_option\s+(maxHeartbeats|maxRecDepth|timeout)\b/, "raising resource limits"],
];

const withoutComments = (source) =>
  source.replace(/\/-[\s\S]*?-\//g, (c) => c.replace(/[^\n]/g, " ")).replace(/--.*$/gm, "");

/** Throws an ExtractError if a public upload uses anything beyond plain definitions and proofs. */
export function checkPublicUpload(source) {
  const code = withoutComments(source);
  for (const [pattern, what] of FORBIDDEN) {
    if (pattern.test(code)) throw new ExtractError(`not allowed on the public server: ${what}`);
  }
  code.split("\n").forEach((line, i) => {
    if (line.trim() === "" || /^\s/.test(line) || line.startsWith("|")) return;
    if (!ALLOWED_COMMANDS.test(line)) {
      throw new ExtractError(`line ${i + 1}: only theorem/lemma/example/def/inductive/structure/namespace/open are allowed at top level`);
    }
  });
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const onData = (chunk) => {
      size += chunk.length;
      if (size <= maxBytes) return chunks.push(chunk);
      // Stop buffering but keep draining, so the client still receives our 413 answer.
      req.off("data", onData);
      req.resume();
      reject(Object.assign(new ExtractError(`file is too large (max ${Math.round(maxBytes / 1000)} KB)`), { status: 413 }));
    };
    req.on("data", onData);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Fixed-window limit per client address; only used by the public server. */
function rateLimiter(perMinute) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > 60_000) {
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count++;
    return entry.count <= perMinute;
  };
}

/**
 * Returns a connect-style middleware (req, res, next). Requests outside /api/lean and
 * /api/extract go to `next`, or get a 404 when there is none.
 */
export function createLeanHandler({
  strict = false,
  timeoutMs = 30_000,
  maxBytes = 200_000,
  allowOrigins = [],
  perMinute = 20,
  where = "on this machine",
} = {}) {
  const allow = rateLimiter(perMinute);
  let version = null;
  const getVersion = () => (version ??= leanVersion());

  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  return async (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://local");
    const route = url.pathname.replace(/\/+$/, "");
    if (route !== "/api/lean" && route !== "/api/extract") {
      if (next) return next();
      return send(res, 404, { error: "not found" });
    }

    const origin = req.headers.origin;
    if (origin && allowOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }
    // Public server: other websites may not spend our Lean time from their visitors' browsers.
    if (strict && origin && !allowOrigins.includes(origin)) return send(res, 403, { error: "origin not allowed" });

    if (route === "/api/lean") {
      try {
        return send(res, 200, { available: true, version: getVersion() });
      } catch (e) {
        return send(res, 200, { available: false, error: e.message });
      }
    }

    if (req.method !== "POST") return send(res, 405, { error: "POST a { name, source } body" });
    const client = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
    if (strict && !allow(client)) return send(res, 429, { error: "too many uploads; wait a minute and try again" });

    try {
      const { name, source } = JSON.parse(await readBody(req, maxBytes));
      if (typeof source !== "string" || !source.trim()) throw new ExtractError("the file is empty");
      if (strict) checkPublicUpload(source);
      const fileName = typeof name === "string" && name ? name.slice(0, 80) : "upload.lean";
      const slug = fileName.replace(/\.lean$/i, "").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 40) || "upload";
      const meta = {
        id: `upload-${slug}-${Date.now().toString(36)}`,
        title: `${theoremName(source) ?? slug} (uploaded)`,
        description: `${fileName}, run through Lean ${where} just now.`,
        viz: "goal",
      };
      const trace = buildTrace(meta, source, getVersion(), new Date().toLocaleDateString("en-CA"), { timeoutMs });
      trace.viz = guessViz(trace.steps);
      return send(res, 200, { trace });
    } catch (e) {
      // ExtractError = a problem with the file (Lean error, unsupported layout). Anything else is ours.
      const ours = !(e instanceof ExtractError || e instanceof SyntaxError);
      if (ours) console.error(e);
      return send(res, ours ? 500 : (e.status ?? 422), { error: ours ? "internal error" : e.message });
    }
  };
}
