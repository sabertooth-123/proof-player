import type { VizFrame } from "../types/proof";

const W = 360, H = 290, R = 104, NR = 21;
const MIN_SLOTS = 6; // graph_path uses nodes 1..6, so they fill a hexagon

type Props = { nodes: NonNullable<VizFrame["nodes"]>; edges: NonNullable<VizFrame["edges"]> };

export function GraphView({ nodes, edges }: Props) {
  if (nodes.length === 0) return <p className="pp-muted">No graph in the current goal.</p>;

  // A node's place depends only on its own number, so nodes never jump around
  // when new edges appear. Slot k of N on a circle, starting at the top.
  const numbers = nodes.map((n) => Number(n.id)).filter(Number.isFinite);
  const slots = Math.max(MIN_SLOTS, ...numbers);
  const pos = new Map(
    nodes.map((n, i) => {
      const num = Number(n.id);
      const slot = Number.isFinite(num) ? (((num - 1) % slots) + slots) % slots : i;
      const angle = -Math.PI / 2 + (2 * Math.PI * slot) / slots;
      return [n.id, { x: W / 2 + R * Math.cos(angle), y: H / 2 + R * Math.sin(angle) }] as const;
    }),
  );

  // Remount when the picture changes so the "newest edge" animation replays.
  const signature =
    edges.map((e) => `${e.from}>${e.to}${e.isNew ? "*" : ""}`).join("|") +
    "@" + (nodes.find((n) => n.current)?.id ?? "");

  return (
    <div>
      <svg key={signature} className="pp-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph of edges proved so far">
        <defs>
          {["pp-arrow", "pp-arrow-new"].map((id) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={id} />
            </marker>
          ))}
        </defs>
        {edges.map((e) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          if (len === 0) return null; // self-loop: not drawn
          const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
          return (
            <g key={`${e.from}>${e.to}`}>
              <line
                className={`pp-edge${e.isNew ? " pp-changed" : ""}`}
                x1={a.x + ux * NR} y1={a.y + uy * NR}
                x2={b.x - ux * (NR + 3)} y2={b.y - uy * (NR + 3)}
                markerEnd={`url(#${e.isNew ? "pp-arrow-new" : "pp-arrow"})`}
              />
              {e.isNew && (
                <text className="pp-edge-label" x={(a.x + b.x) / 2 - uy * 34} y={(a.y + b.y) / 2 + ux * 34}>newest</text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          return (
            <g key={n.id}>
              {n.current && <circle className="pp-node-halo" cx={p.x} cy={p.y} r={NR + 7} />}
              <circle className={`pp-node${n.current ? " pp-node-current" : ""}`} cx={p.x} cy={p.y} r={NR} />
              <text className={`pp-node-text${n.current ? " pp-node-text-current" : ""}`} x={p.x} y={p.y}>{n.label}</text>
            </g>
          );
        })}
      </svg>
      <ul className="pp-legend">
        <li><span className="pp-swatch pp-swatch-node" /> current node</li>
        <li><span className="pp-swatch pp-swatch-edge" /> newest edge</li>
      </ul>
      {edges.length === 0 && <p className="pp-muted">No edge proved yet.</p>}
    </div>
  );
}
