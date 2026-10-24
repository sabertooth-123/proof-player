import type { VizFrame } from "../types/proof";

type Items = NonNullable<VizFrame["items"]>;

function Row({ tone, title, hint, items }: { tone: "current" | "target"; title: string; hint: string; items: Items }) {
  if (items.length === 0) return null;
  return (
    <div className={`pp-row pp-row-${tone}`}>
      <div className="pp-row-label">
        <strong>{title}</strong> <span className="pp-muted">{hint}</span>
      </div>
      <div className="pp-boxes">
        {items.map((it) => (
          <span key={it.id} className={`pp-box pp-box-${tone}${it.changed ? " pp-changed" : ""}`}>{it.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Left of "=" is where the proof is now; right of "=" is what it must become. */
export function ListView({ items }: { items: Items }) {
  if (items.length === 0) return <p className="pp-muted">No list in the current goal.</p>;
  const current = items.filter((i) => i.id.startsWith("L:"));
  const target = items.filter((i) => i.id.startsWith("R:"));
  // Remount when the frame changes so the "changed" animation replays.
  const signature = items.map((i) => i.id + (i.changed ? "*" : "")).join("|");
  return (
    <div key={signature}>
      <Row tone="current" title="Current" hint="left of =" items={current} />
      {current.length > 0 && target.length > 0 && (
        <div className="pp-divider" role="separator" aria-label="equals"><span>=</span></div>
      )}
      <Row tone="target" title="Target" hint="right of =" items={target} />
    </div>
  );
}
