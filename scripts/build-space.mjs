#!/usr/bin/env node
// Assembles space/: the exact files to upload to the Hugging Face Space that runs the
// public Lean server. Usage: npm run space
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "space");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "scripts"), { recursive: true });
mkdirSync(join(OUT, "lean-server"), { recursive: true });

const files = [
  ["lean-server/Dockerfile", "Dockerfile"],
  ["lean-server/SPACE_README.md", "README.md"],
  ["lean-server/server.mjs", "lean-server/server.mjs"],
  ["scripts/extract-traces.mjs", "scripts/extract-traces.mjs"],
  ["scripts/lean-api.mjs", "scripts/lean-api.mjs"],
];
for (const [from, to] of files) cpSync(join(ROOT, from), join(OUT, to));

console.log(`space/ ready (${files.length} files). Upload its contents to the Hugging Face Space, keeping the folders.`);
