
import { useEffect } from "react";

interface PlaybackControlsProps {
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}

export default function PlaybackControls({
  stepIndex,
  stepCount,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
}: PlaybackControlsProps) {
  const lastIndex = Math.max(0, stepCount - 1);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= lastIndex;
  const progress =
    stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (stepCount > 0) onTogglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrev, onNext, onTogglePlay, stepCount]);

  return (
    <section className="playback-controls" aria-label="Proof playback">
      <div className="playback-controls__buttons">
        <button onClick={onPrev} disabled={isFirst}>
          ← Prev
        </button>

        <button onClick={onReset} disabled={stepCount === 0}>
          Reset
        </button>

        <button
          onClick={onTogglePlay}
          disabled={stepCount === 0 || (!isPlaying && isLast)}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button onClick={onNext} disabled={isLast}>
          Next →
        </button>
      </div>

      <p>
        Step {stepCount > 0 ? stepIndex + 1 : 0} / {stepCount}
      </p>

      <div
        className="playback-controls__progress"
        role="progressbar"
        aria-label="Proof progress"
        aria-valuemin={0}
        aria-valuemax={stepCount}
        aria-valuenow={stepCount > 0 ? stepIndex + 1 : 0}
      >
        <div
          className="playback-controls__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}
