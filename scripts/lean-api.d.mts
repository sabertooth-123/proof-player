// Types for scripts/lean-api.mjs (used from vite.config.ts and tests).
import type { IncomingMessage, ServerResponse } from "node:http";

export function checkPublicUpload(source: string): void;

export function createLeanHandler(options?: {
  strict?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  allowOrigins?: string[];
  perMinute?: number;
  where?: string;
}): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>;
