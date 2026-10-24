import type { VizFrame } from "../types/proof";

type Items = NonNullable<VizFrame["items"]>;

function Row({ label, items }: { label: string; items: Items }) {
  if (items.length === 0) return null;
  return (
    <div className="pp-row">
      <div className="pp-row-label pp-muted">{label}</div>
      <div className="pp-boxes">
        {items.map((it) => (
          <span key={it.id} className={`pp-box${it.changed ? " pp-changed" : ""}`}>{it.label}</span>
        ))}
      </div>
    </div>
  );
}

export function ListView({ items }: { items: Items }) {
  if (items.length === 0) return <p className="pp-muted">No list in the current goal.</p>;
  // Remount when the frame changes so the "changed" animation replays.
  const signature = items.map((i) => i.id + (i.changed ? "*" : "")).join("|");
  return (
    <div key={signature}>
      <Row label="Left of =" items={items.filter((i) => i.id.startsWith("L:"))} />
      <Row label="Right of =" items={items.filter((i) => i.id.startsWith("R:"))} />
    </div>
  );
}
