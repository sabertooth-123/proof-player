// Public Lean server for the live site's "Open .lean file" (runs on a Hugging Face Space).
// Same API as the dev server (scripts/lean-api.mjs), with strict checks on what a file may contain.
//   PORT           default 7860 (Hugging Face's default app_port)
//   ALLOW_ORIGINS  comma-separated sites allowed to call it from a browser

import { createServer } from "node:http";
import { buildTrace } from "../scripts/extract-traces.mjs";
import { createLeanHandler } from "../scripts/lean-api.mjs";

const PORT = Number(process.env.PORT ?? 7860);
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS ?? "https://proof-player-eight.vercel.app,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const api = createLeanHandler({
  strict: true,
  timeoutMs: 20_000,
  maxBytes: 50_000,
  allowOrigins: ALLOW_ORIGINS,
  perMinute: 15,
  where: "on the Proof Player server",
});

const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Proof Player Lean server: GET /api/lean, POST /api/extract { name, source }\n");
  }
  return api(req, res);
});

// Warm up once so the first visitor doesn't wait for Lean to load its core library from disk.
try {
  const t = Date.now();
  buildTrace({ id: "warmup", title: "", description: "", viz: "goal" }, "theorem warm : 1 = 1 := by\n  rfl\n", "", "");
  console.log(`warm-up extraction ok in ${Date.now() - t} ms`);
} catch (e) {
  console.error("warm-up failed:", e.message);
}

server.listen(PORT, () => console.log(`Lean server on :${PORT}, allowed origins: ${ALLOW_ORIGINS.join(", ")}`));
