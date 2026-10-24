
import { useEffect, useRef } from "react";

interface CodeViewerProps {
  source: string;
  activeLine: number;
}

export default function CodeViewer({
  source,
  activeLine,
}: CodeViewerProps) {
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lines = source.split(/\r?\n/);

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeLine]);

  return (
    <section className="code-viewer">
      <h2>Lean Source</h2>

      <div className="code-viewer__content">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isActive = lineNumber === activeLine;

          return (
            <div
              key={lineNumber}
              ref={isActive ? activeLineRef : null}
              className={`code-line${isActive ? " code-line--active" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="code-line__number">
                {lineNumber}
              </span>
              <pre className="code-line__source">{line || " "}</pre>
            </div>
          );
        })}
      </div>
    </section>
  );
}
