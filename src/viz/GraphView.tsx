import type { VizFrame } from "../types/proof";

const W = 360, H = 300, R = 105, NR = 18;

export function GraphView({ nodes, edges }: Pick<Required<VizFrame>, "nodes" | "edges">) {
  if (nodes.length === 0) return <p className="pp-muted">No edges in the current goal yet.</p>;
  const sorted = [...nodes].sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id));
  const pos = new Map(
    sorted.map((n, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / sorted.length;
      return [n.id, { x: W / 2 + R * Math.cos(angle), y: H / 2 + R * Math.sin(angle) }] as const;
    }),
  );
  const signature = edges.map((e) => `${e.from}>${e.to}${e.isNew ? "*" : ""}`).join("|");
  return (
    <svg key={signature} className="pp-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph of edges in the goal">
      <defs>
        {[["pp-arrow", "pp-arrow"], ["pp-arrow-new", "pp-arrow-new"]].map(([id, cls]) => (
          <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={cls} />
          </marker>
        ))}
      </defs>
      {edges.map((e) => {
        const a = pos.get(e.from)!, b = pos.get(e.to)!;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len === 0) return null; // self-loop: not drawn
        const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
        return (
          <line
            key={`${e.from}>${e.to}`}
            className={`pp-edge${e.isNew ? " pp-changed" : ""}`}
            x1={a.x + ux * NR} y1={a.y + uy * NR}
            x2={b.x - ux * (NR + 3)} y2={b.y - uy * (NR + 3)}
            markerEnd={`url(#${e.isNew ? "pp-arrow-new" : "pp-arrow"})`}
          />
        );
      })}
      {sorted.map((n) => {
        const p = pos.get(n.id)!;
        return (
          <g key={n.id}>
            <circle className="pp-node" cx={p.x} cy={p.y} r={NR} />
            <text className="pp-node-text" x={p.x} y={p.y}>{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
