import { useEffect, useRef } from "react";

interface CodeViewerProps {
  source: string;
  activeLine: number;
}

export default function CodeViewer({ source, activeLine }: CodeViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lines = source.split(/\r?\n/);

  // Scroll only the code box. scrollIntoView would also scroll the page shell,
  // which has overflow: hidden and would push the header off screen.
  useEffect(() => {
    const box = contentRef.current;
    const line = activeLineRef.current;
    if (!box || !line) return;
    const top = line.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (top < box.scrollTop || top + line.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: top - box.clientHeight / 2, behavior: "smooth" });
    }
  }, [activeLine, source]);

  return (
    <section className="code-viewer">
      <h2>Lean Source</h2>

      <div className="code-viewer__content" ref={contentRef}>
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
              <span className="code-line__number">{lineNumber}</span>
              <pre className="code-line__source">{line || " "}</pre>
            </div>
          );
        })}
      </div>
    </section>
  );
}
