import { useCallback, useEffect, useRef, useState } from "react";
import type { ProofTrace } from "../types/proof";
import { extractLeanFile, leanVersion, UploadError, type UploadErrorKind } from "../lib/leanUpload";

interface LeanFileOpenerProps {
  onLoaded: (trace: ProofTrace) => void;
  onBackToExamples: () => void;
}

interface FailedUpload {
  file: string;
  kind: UploadErrorKind;
  message: string;
  source: string;
}

// Heading and one line of advice per kind of failure.
const ADVICE: Record<UploadErrorKind, [string, string]> = {
  lean: ["Lean rejected this proof", "This is Lean's own error, not Proof Player's. Fix the line shown and open the file again."],
  layout: ["Proof Player can't read this layout yet", "One theorem per file and one tactic per line; `| case => tac` and `·` bullets are fine."],
  policy: ["Not allowed on the public server", "Only plain definitions and proofs run here (no #eval, import, IO or custom syntax). It runs locally with npm run dev."],
  limit: ["Over the server's limits", "Files up to 50 KB and 20 s of Lean time, 15 uploads a minute. Try a smaller proof or wait a minute."],
  server: ["The Lean server had a problem", "Try again in a moment. The built-in proofs still work."],
  network: ["Couldn't reach the Lean server", "It may be offline. The built-in proofs still work; try again later."],
  "not-lean": ["That's not a .lean file", "Choose a file ending in .lean."],
  malformed: ["The Lean server sent something unexpected", "Try again; if it keeps happening the server needs updating."],
};

/** The source lines an error message points at ("line 7: ..."), at most three. */
function citedLines(message: string, source: string): { line: number; text: string }[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const cited = [...new Set([...message.matchAll(/\bline (\d+)\b/g)].map((m) => Number(m[1])))];
  return cited
    .filter((n) => n >= 1 && n <= lines.length)
    .slice(0, 3)
    .map((n) => ({ line: n, text: lines[n - 1] }));
}

/**
 * "Open .lean file" button plus drag-and-drop anywhere on the page. Only shown once a Lean
 * server answers: the dev server's own Lean, or the public one the live site is built with.
 */
export default function LeanFileOpener({ onLoaded, onBackToExamples }: LeanFileOpenerProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // file name being run through Lean
  const [error, setError] = useState<FailedUpload | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    leanVersion().then((v) => live && setVersion(v));
    return () => {
      live = false;
    };
  }, []);

  const open = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(file.name);
      try {
        onLoaded(await extractLeanFile(file));
      } catch (e) {
        const u = e instanceof UploadError ? e : new UploadError("server", (e as Error).message);
        setError({ file: file.name, kind: u.kind, message: u.message, source: u.source });
      } finally {
        setBusy(null);
      }
    },
    [onLoaded],
  );

  // Drag a file anywhere onto the page.
  useEffect(() => {
    if (!version) return;
    let depth = 0; // dragenter/dragleave fire for every child element
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) void open(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [version, open]);

  if (!version) return null;

  return (
    <>
      <div className="lean-opener">
        <button
          type="button"
          className="lean-opener__button"
          disabled={busy !== null}
          aria-busy={busy !== null}
          onClick={() => inputRef.current?.click()}
          title={`Runs the file through Lean ${version} ${import.meta.env.DEV ? "on this machine" : "on the Proof Player server"}`}
        >
          {busy ? <><span className="lean-opener__spinner" aria-hidden="true" />Running Lean…</> : "Open .lean file"}
        </button>
        <span className="sr-only" aria-live="polite">{busy ? `Running ${busy} through Lean` : ""}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".lean"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // so choosing the same file again still fires
            if (file) void open(file);
          }}
        />
      </div>

      {dragging && (
        <div className="lean-drop" aria-hidden="true">
          <p>Drop a .lean file to run it through Lean {version}</p>
        </div>
      )}

      {error && (
        <div className={`lean-error lean-error--${error.kind}`} role="alert">
          <div className="lean-error__head">
            <strong>
              {ADVICE[error.kind][0]}
              <span>{error.file}</span>
            </strong>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
          <pre>{error.message}</pre>
          {citedLines(error.message, error.source).map(({ line, text }) => (
            <div className="lean-error__line" key={line}>
              <span>line {line}</span>
              <code>{text || " "}</code>
            </div>
          ))}
          <p>{ADVICE[error.kind][1]}</p>
          <div className="lean-error__actions">
            <button type="button" onClick={() => inputRef.current?.click()}>Open another file</button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                onBackToExamples();
              }}
            >
              Back to the examples
            </button>
          </div>
        </div>
      )}
    </>
  );
}
