import type { VizFrame } from "../types/proof";

export function GoalChips({ items }: { items: NonNullable<VizFrame["items"]> }) {
  if (items.length === 0) return <p className="pp-muted">No goals left.</p>;
  return (
    <div className="pp-chips">
      {items.map((it) => (
        <span key={it.id} className={`pp-chip${it.changed ? " pp-changed" : ""}`}>{it.label}</span>
      ))}
    </div>
  );
}
