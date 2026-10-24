import { useCallback, useEffect, useRef, useState } from "react";
import type { ProofTrace } from "../types/proof";
import { extractLeanFile, leanVersion } from "../lib/leanUpload";

interface LeanFileOpenerProps {
  onLoaded: (trace: ProofTrace) => void;
}

/**
 * "Open .lean file" button plus drag-and-drop anywhere on the page. Only shown when the
 * server can run Lean (npm run dev on a machine with Lean); the static site never shows it.
 */
export default function LeanFileOpener({ onLoaded }: LeanFileOpenerProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // file name being run through Lean
  const [error, setError] = useState<{ file: string; message: string } | null>(null);
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
        setError({ file: file.name, message: (e as Error).message });
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
          onClick={() => inputRef.current?.click()}
          title={`Runs the file through Lean ${version} on this machine`}
        >
          {busy ? "Running Lean…" : "Open .lean file"}
        </button>
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
        <div className="lean-error" role="alert">
          <div className="lean-error__head">
            <strong>Couldn't open {error.file}</strong>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
          <pre>{error.message}</pre>
          <p>
            Supported: one theorem per file, one tactic per line, core Lean only (no Mathlib).
          </p>
        </div>
      )}
    </>
  );
}
