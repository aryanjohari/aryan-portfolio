"use client";

import { useId, useMemo } from "react";

import type {
  ArchitectureGraph,
  ArchitectureGraphSkin,
  GraphNodeKind,
  GraphNodeShape,
} from "@/lib/architecture-graph";
import {
  defaultShapeForKind,
  resolveArchitectureSkin,
} from "@/lib/architecture-graph";
import {
  layoutArchitectureGraph,
  type GraphLayoutNode,
  type GraphLayoutResult,
} from "@/lib/architecture-graph-layout";

/** Shared fitted-overview composition. Kept beside the renderer until C4 layout lands. */
const LAYOUT_OPTS = {
  rankGap: 248,
  spineGapMul: 1.28,
  ranksGapMul: 0.58,
  laneGap: 56,
  stackGap: 52,
  satelliteStackGap: 36,
  nodeWidth: 152,
  nodeHeight: 54,
  padding: 72,
  groupLabelH: 36,
  spineScale: 1.14,
  satelliteScale: 0.86,
  coreProcessScale: 1.2,
  staggerX: 14,
  ingressYBias: -12,
  coreYBias: 12,
  egressYBias: 18,
} as const;

export type ArchitectureGraphViewProps = {
  graph: ArchitectureGraph;
  className?: string;
  /** Extra class on the root SVG (e.g. minimap / overlay). */
  svgClassName?: string;
  ariaLabel?: string;
  /** Render the graph at full opacity. */
  staticFull?: boolean;
  /** Fixed world pixels for specialized consumers. Default fits the container. */
  worldSized?: boolean;
  /** Optional precomputed layout (must match LAYOUT_OPTS). */
  layout?: GraphLayoutResult;
  /** Project slug — resolves skin when graph.skin is omitted. */
  slug?: string;
  /** Override resolved skin. */
  skin?: ArchitectureGraphSkin;
  /** Node ids currently spotlighted (path beat / hover). */
  highlightedIds?: readonly string[];
  /** Node ids that open a C3 dive when activated. */
  diveNodeIds?: readonly string[];
  /** Called when a dive-capable node is activated. */
  onNodeActivate?: (nodeId: string) => void;
};

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 3) {
    const [a, b, c] = points;
    return `M ${a.x} ${a.y} Q ${b.x} ${b.y} ${c.x} ${c.y}`;
  }
  // Orthogonal elbows (4 pts): soft rounded corners along the spine
  if (points.length === 4) {
    const [a, b, c, d] = points;
    const dx1 = b.x - a.x;
    const dy1 = b.y - a.y;
    const dx2 = c.x - b.x;
    const dy2 = c.y - b.y;
    const dx3 = d.x - c.x;
    const dy3 = d.y - c.y;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    const len3 = Math.hypot(dx3, dy3);
    const r = Math.min(16, len1 * 0.4, len2 * 0.4, len3 * 0.4);
    if (r < 4) {
      return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    }
    const u1x = dx1 / (len1 || 1);
    const u1y = dy1 / (len1 || 1);
    const u2x = dx2 / (len2 || 1);
    const u2y = dy2 / (len2 || 1);
    const u3x = dx3 / (len3 || 1);
    const u3y = dy3 / (len3 || 1);
    return [
      `M ${a.x} ${a.y}`,
      `L ${b.x - u1x * r} ${b.y - u1y * r}`,
      `Q ${b.x} ${b.y} ${b.x + u2x * r} ${b.y + u2y * r}`,
      `L ${c.x - u2x * r} ${c.y - u2y * r}`,
      `Q ${c.x} ${c.y} ${c.x + u3x * r} ${c.y + u3y * r}`,
      `L ${d.x} ${d.y}`,
    ].join(" ");
  }
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function resolveShape(node: GraphLayoutNode): GraphNodeShape {
  return node.shape ?? defaultShapeForKind(node.kind);
}

/** Tiny kind mark — reads at overview scale without competing with the label. */
function KindMark({
  kind,
  cx,
  cy,
}: {
  kind: GraphNodeKind | undefined;
  cx: number;
  cy: number;
}) {
  const k = kind ?? "other";
  const className = `arch-graph-kind-mark arch-graph-kind-mark--${k}`;

  if (k === "input") {
    return (
      <g className={className} aria-hidden="true">
        <path d={`M ${cx - 4} ${cy} L ${cx} ${cy - 3.5} L ${cx} ${cy + 3.5} Z`} />
        <line x1={cx} y1={cy} x2={cx + 5} y2={cy} />
      </g>
    );
  }
  if (k === "output") {
    return (
      <g className={className} aria-hidden="true">
        <line x1={cx - 5} y1={cy} x2={cx} y2={cy} />
        <path d={`M ${cx} ${cy - 3.5} L ${cx + 4} ${cy} L ${cx} ${cy + 3.5} Z`} />
      </g>
    );
  }
  if (k === "store") {
    return (
      <g className={className} aria-hidden="true">
        <line x1={cx - 4} y1={cy - 3} x2={cx + 4} y2={cy - 3} />
        <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} />
        <line x1={cx - 4} y1={cy + 3} x2={cx + 4} y2={cy + 3} />
      </g>
    );
  }
  if (k === "decision") {
    return (
      <path
        className={className}
        aria-hidden="true"
        d={`M ${cx} ${cy - 4} L ${cx + 4} ${cy} L ${cx} ${cy + 4} L ${cx - 4} ${cy} Z`}
      />
    );
  }
  if (k === "process") {
    return (
      <g className={className} aria-hidden="true">
        <rect x={cx - 3.5} y={cy - 3.5} width={7} height={7} rx={1} />
      </g>
    );
  }
  return (
    <circle className={className} aria-hidden="true" cx={cx} cy={cy} r={2.5} />
  );
}

function NodeShape({
  node,
  shape,
}: {
  node: GraphLayoutNode;
  shape: GraphNodeShape;
}) {
  const kind = node.kind ?? "other";
  const { x, y, width: w, height: h } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const className = `arch-graph-node-shape arch-graph-node-shape--${kind} arch-graph-node-shape--${shape}`;

  if (shape === "diamond") {
    const inset = 2;
    return (
      <path
        className={className}
        d={`M ${cx} ${y + inset} L ${x + w - inset} ${cy} L ${cx} ${y + h - inset} L ${x + inset} ${cy} Z`}
      />
    );
  }

  if (shape === "cylinder") {
    const ry = Math.max(7, Math.round(h * 0.16));
    return (
      <g className={className}>
        <path
          d={[
            `M ${x} ${y + ry}`,
            `A ${w / 2} ${ry} 0 0 1 ${x + w} ${y + ry}`,
            `L ${x + w} ${y + h - ry}`,
            `A ${w / 2} ${ry} 0 0 1 ${x} ${y + h - ry}`,
            "Z",
          ].join(" ")}
        />
        <ellipse cx={cx} cy={y + ry} rx={w / 2} ry={ry} className="arch-graph-cylinder-cap" />
        <ellipse
          cx={cx}
          cy={y + h - ry}
          rx={w / 2}
          ry={ry}
          className="arch-graph-cylinder-rim"
        />
      </g>
    );
  }

  if (shape === "stadium") {
    // Chip / pill — input language
    const accentH = Math.max(12, h - 20);
    return (
      <g className={className}>
        <rect x={x} y={y} width={w} height={h} rx={h / 2} ry={h / 2} />
        <rect
          className="arch-graph-chip-accent"
          x={x + 8}
          y={y + (h - accentH) / 2}
          width={3}
          height={accentH}
          rx={1.5}
        />
      </g>
    );
  }

  if (shape === "ticket") {
    // Ticket / stub — output language (notched trailing edge)
    const notch = Math.max(9, Math.round(h * 0.2));
    return (
      <path
        className={className}
        d={[
          `M ${x} ${y}`,
          `L ${x + w - notch} ${y}`,
          `L ${x + w} ${cy}`,
          `L ${x + w - notch} ${y + h}`,
          `L ${x} ${y + h}`,
          "Z",
        ].join(" ")}
      />
    );
  }

  // Tablet (process) or plain rect
  const rx = shape === "rect" ? 2 : 10;
  if (kind === "process" || shape === "rounded") {
    return (
      <g className={className}>
        <rect x={x} y={y} width={w} height={h} rx={rx} ry={rx} />
        <rect
          className="arch-graph-tablet-bezel"
          x={x + 4}
          y={y + 4}
          width={w - 8}
          height={h - 8}
          rx={Math.max(2, rx - 3)}
          ry={Math.max(2, rx - 3)}
        />
      </g>
    );
  }

  return (
    <rect
      className={className}
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      ry={rx}
    />
  );
}

function GraphNode({
  node,
  highlighted,
  diveable,
  onActivate,
}: {
  node: GraphLayoutNode;
  highlighted?: boolean;
  diveable?: boolean;
  onActivate?: (nodeId: string) => void;
}) {
  const shape = resolveShape(node);
  const kind = node.kind ?? "other";
  const w = node.width;
  const h = node.height;
  const markX = node.x + (shape === "stadium" ? 22 : 14);
  const markY = node.y + Math.max(10, h * 0.22);
  const labelPadL = shape === "stadium" ? 28 : shape === "ticket" ? 10 : 18;
  const labelPadR = shape === "ticket" ? 18 : 10;
  const platePadX = Math.max(5, Math.round(w * 0.04));
  const platePadY = Math.max(4, Math.round(h * 0.08));

  const classes = [
    "arch-graph-node",
    `arch-graph-node--${kind}`,
    `arch-graph-node--${shape}`,
    `arch-graph-node--weight-${node.weight}`,
    highlighted ? "is-highlighted" : "",
    diveable ? "is-diveable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      className={classes}
      data-node-id={node.id}
      data-diagram-node=""
      data-kind={kind}
      data-shape={shape}
      data-weight={node.weight}
      data-diveable={diveable ? "1" : undefined}
      role={diveable ? "button" : undefined}
      tabIndex={diveable ? 0 : undefined}
      aria-label={diveable ? `Dive into ${node.label}` : undefined}
      onClick={
        diveable && onActivate
          ? (event) => {
              event.preventDefault();
              onActivate(node.id);
            }
          : undefined
      }
      onKeyDown={
        diveable && onActivate
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate(node.id);
              }
            }
          : undefined
      }
      style={diveable ? { cursor: "pointer" } : undefined}
    >
      <rect
        className="arch-graph-node-plate"
        x={node.x - platePadX}
        y={node.y - platePadY}
        width={w + platePadX * 2}
        height={h + platePadY * 2}
        rx={shape === "stadium" ? h / 2 + 4 : 14}
        ry={shape === "stadium" ? h / 2 + 4 : 14}
        aria-hidden="true"
      />
      <NodeShape node={node} shape={shape} />
      <KindMark kind={node.kind} cx={markX} cy={markY} />
      <foreignObject
        x={node.x + labelPadL}
        y={node.y + Math.max(4, h * 0.1)}
        width={Math.max(24, w - labelPadL - labelPadR)}
        height={Math.max(20, h - Math.max(8, h * 0.2))}
        className="arch-graph-label-fo"
      >
        <div className="arch-graph-label">{node.label}</div>
      </foreignObject>
    </g>
  );
}

/**
 * Owned architecture graph: IR → layoutArchitectureGraph → SVG.
 * Stable hooks: data-node-id, data-edge-id (and data-group-id).
 */
export function ArchitectureGraphView({
  graph,
  className,
  svgClassName,
  ariaLabel,
  staticFull,
  worldSized,
  layout: layoutProp,
  slug,
  skin: skinProp,
  highlightedIds,
  diveNodeIds,
  onNodeActivate,
}: ArchitectureGraphViewProps) {
  const reactId = useId().replace(/:/g, "");
  const layout = useMemo(
    () => layoutProp ?? layoutArchitectureGraph(graph, LAYOUT_OPTS),
    [graph, layoutProp],
  );
  const skin = skinProp ?? resolveArchitectureSkin(graph, slug);
  const highlighted = useMemo(
    () => new Set(highlightedIds ?? []),
    [highlightedIds],
  );
  const diveable = useMemo(() => new Set(diveNodeIds ?? []), [diveNodeIds]);

  const label =
    ariaLabel ?? (graph.title ? `How ${graph.title} works` : "Architecture diagram");
  const markerId = `arch-graph-arrow-${reactId}`;
  const hasHighlight = highlighted.size > 0;

  const hasDiveTargets = diveable.size > 0;

  return (
    <div
      className={className}
      data-arch-graph
      data-arch-skin={skin}
      data-world-sized={worldSized ? "1" : undefined}
      data-has-highlight={hasHighlight ? "1" : undefined}
    >
      <svg
        className={`project-diagram-svg arch-graph-svg${svgClassName ? ` ${svgClassName}` : ""}${staticFull ? " is-static-full" : ""}${worldSized ? " is-world-sized" : ""}${hasHighlight ? " has-highlight" : ""}`}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={worldSized ? layout.width : undefined}
        height={worldSized ? layout.height : undefined}
        role={hasDiveTargets ? "group" : "img"}
        aria-label={label}
        data-layout-mode={layout.mode}
        data-arch-skin={skin}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="arch-graph-arrow" />
          </marker>
        </defs>

        {layout.groups.map((g) => (
          <g key={g.id} className="arch-graph-group" data-group-id={g.id}>
            <rect
              className="arch-graph-group-box"
              x={g.x}
              y={g.y}
              width={g.width}
              height={g.height}
              rx={4}
              ry={4}
            />
            <text className="arch-graph-group-label" x={g.x + 12} y={g.y + 16}>
              {g.label}
            </text>
          </g>
        ))}

        <g className="arch-graph-edges">
          {layout.edges.map((edge) => {
            const d = pointsToPath(edge.points);
            const mid = edge.points[Math.floor(edge.points.length / 2)];
            const edgeLit =
              highlighted.has(edge.from) && highlighted.has(edge.to);
            return (
              <g
                key={edge.id}
                className={`arch-graph-edge${edge.style === "dashed" ? " is-dashed" : ""}${edge.cyclic ? " is-cyclic" : ""}${edgeLit ? " is-highlighted" : ""}`}
                data-edge-id={edge.id}
                data-diagram-edge=""
                data-from={edge.from}
                data-to={edge.to}
              >
                <path
                  className="arch-graph-edge-path"
                  d={d}
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                />
                {edge.label && mid ? (
                  <text
                    className="arch-graph-edge-label"
                    x={mid.x}
                    y={mid.y - 6}
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        <g className="arch-graph-nodes">
          {layout.nodes.map((node) => (
            <GraphNode
              key={node.id}
              node={node}
              highlighted={highlighted.has(node.id)}
              diveable={diveable.has(node.id)}
              onActivate={onNodeActivate}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Layout once for callers that need dimensions without mounting. */
export function layoutOwnedGraph(graph: ArchitectureGraph): GraphLayoutResult {
  return layoutArchitectureGraph(graph, LAYOUT_OPTS);
}
