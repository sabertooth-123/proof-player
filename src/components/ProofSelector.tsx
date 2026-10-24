import type { ProofTrace, VizKind } from "../types/proof";

const PICTURE: Record<VizKind, string> = { list: "List view", graph: "Graph view", goal: "Goal view" };

interface ProofSelectorProps {
  traces: ProofTrace[];
  selectedTraceId: string;
  onSelect: (traceId: string) => void;
}

export default function ProofSelector({
  traces,
  selectedTraceId,
  onSelect,
}: ProofSelectorProps) {
  return (
    <section className="proof-selector">
      <label htmlFor="proof-select">Select a proof</label>

      <select
        id="proof-select"
        value={selectedTraceId}
        onChange={(event) => {
          onSelect(event.target.value);
          // Hand the arrow keys back to the player instead of the dropdown.
          event.target.blur();
        }}
      >
        {traces.map((trace) => (
          <option key={trace.id} value={trace.id}>
            {trace.title}
          </option>
        ))}
      </select>

      {traces.map(
        (trace) =>
          trace.id === selectedTraceId && (
            <p key={trace.id}>
              <span className="proof-meta">
                {PICTURE[trace.viz]} · {trace.steps.length} steps{trace.id.startsWith("upload-") ? " · uploaded" : ""}
              </span>{" "}
              {trace.description}
            </p>
          ),
      )}
    </section>
  );
}
