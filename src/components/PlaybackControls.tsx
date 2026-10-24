import { useEffect } from "react";
import type { TransitionKind } from "../lib/transition";

export interface TimelineMarker {
  kind: TransitionKind;
  label: string; // tactic plus what changed, for the tooltip and screen readers
}

interface PlaybackControlsProps {
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  markers: TimelineMarker[];
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
}

const KIND_NAMES: Partial<Record<TransitionKind, string>> = {
  split: "goals split",
  close: "goal closed",
  complete: "proof complete",
  focus: "case started",
};

export default function PlaybackControls({
  stepIndex,
  stepCount,
  isPlaying,
  markers,
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
  onSeek,
}: PlaybackControlsProps) {
  const lastIndex = Math.max(0, stepCount - 1);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= lastIndex;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      // Don't hijack keys while the user is typing or choosing a proof. Buttons are
      // fine: after a mouse click the button keeps focus, and the keys must still work.
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.code === "Space") {
        // Also stops a focused button from being "clicked" by the same Space press.
        event.preventDefault();
        if (stepCount > 0) onTogglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "Home") {
        event.preventDefault();
        onReset();
      } else if (event.key === "End") {
        event.preventDefault();
        onSeek(lastIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, onTogglePlay, onReset, onSeek, stepCount, lastIndex]);

  return (
    <section className="playback-controls" aria-label="Proof playback">
      <div className="playback-controls__buttons">
        <button onClick={onPrev} disabled={isFirst} aria-label="Previous step">
          ← Prev
        </button>

        <button onClick={onReset} disabled={stepCount === 0 || isFirst} aria-label="Back to the first step">
          Reset
        </button>

        <button
          onClick={onTogglePlay}
          disabled={stepCount === 0 || (!isPlaying && isLast)}
          aria-pressed={isPlaying}
          className={isPlaying ? "is-playing" : undefined}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button onClick={onNext} disabled={isLast} aria-label="Next step">
          Next →
        </button>
      </div>

      <p aria-live="polite">
        Step {stepCount > 0 ? stepIndex + 1 : 0} / {stepCount}
      </p>

      {/* One marker per step: click to jump. Colour shows what the step did. */}
      <ol className="timeline" aria-label="Proof timeline">
        {markers.map((m, i) => (
          <li key={i}>
            <button
              type="button"
              className={`timeline__step timeline__step--${m.kind}${i <= stepIndex ? " is-done" : ""}${i === stepIndex ? " is-current" : ""}`}
              aria-current={i === stepIndex ? "step" : undefined}
              aria-label={`Step ${i + 1}${KIND_NAMES[m.kind] ? `, ${KIND_NAMES[m.kind]}` : ""}: ${m.label}`}
              title={`Step ${i + 1}: ${m.label}`}
              onClick={() => onSeek(i)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
