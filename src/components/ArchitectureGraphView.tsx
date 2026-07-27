"use client";

import { useId, useMemo } from "react";

import type { ArchitectureGraph } from "@/lib/architecture-graph";
import { JOURNEY_LAYOUT } from "@/lib/architecture-journey";
import {
  layoutArchitectureGraph,
  type GraphLayoutNode,
  type GraphLayoutResult,
} from "@/lib/architecture-graph-layout";

const NODE_W = JOURNEY_LAYOUT.nodeWidth;
const NODE_H = JOURNEY_LAYOUT.nodeHeight;

const LAYOUT_OPTS = JOURNEY_LAYOUT;

export type ArchitectureGraphViewProps = {
  graph: ArchitectureGraph;
  className?: string;
  /** Extra class on the root SVG (e.g. minimap / overlay). */
  svgClassName?: string;
  ariaLabel?: string;
  /** When true, skip tour dim defaults (full opacity). */
  staticFull?: boolean;
  /**
   * Fixed world pixels from layout (camera journey).
   * Default fits the SVG to its container.
   */
  worldSized?: boolean;
  /** Optional precomputed layout (must match LAYOUT_OPTS). */
  layout?: GraphLayoutResult;
};

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 3) {
    const [a, b, c] = points;
    return `M ${a.x} ${a.y} Q ${b.x} ${b.y} ${c.x} ${c.y}`;
  }
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function NodeShape({ node }: { node: GraphLayoutNode }) {
  const shape = node.shape ?? (node.kind === "decision" ? "diamond" : "rounded");
  const kind = node.kind ?? "other";
  const { x, y } = node;
  const cx = x + NODE_W / 2;
  const cy = y + NODE_H / 2;
  const className = `arch-graph-node-shape arch-graph-node-shape--${kind} arch-graph-node-shape--${shape}`;

  if (shape === "diamond") {
    return (
      <path
        className={className}
        d={`M ${cx} ${y} L ${x + NODE_W} ${cy} L ${cx} ${y + NODE_H} L ${x} ${cy} Z`}
      />
    );
  }

  if (shape === "cylinder") {
    const ry = 8;
    return (
      <g className={className}>
        <ellipse cx={cx} cy={y + ry} rx={NODE_W / 2} ry={ry} />
        <rect x={x} y={y + ry} width={NODE_W} height={NODE_H - ry * 2} />
        <ellipse cx={cx} cy={y + NODE_H - ry} rx={NODE_W / 2} ry={ry} />
        <line x1={x} y1={y + ry} x2={x} y2={y + NODE_H - ry} />
        <line x1={x + NODE_W} y1={y + ry} x2={x + NODE_W} y2={y + NODE_H - ry} />
      </g>
    );
  }

  if (shape === "stadium") {
    return (
      <rect
        className={className}
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_H / 2}
        ry={NODE_H / 2}
      />
    );
  }

  const rx = shape === "rect" ? 0 : 6;
  return (
    <rect
      className={className}
      x={x}
      y={y}
      width={NODE_W}
      height={NODE_H}
      rx={rx}
      ry={rx}
    />
  );
}

function GraphNode({ node }: { node: GraphLayoutNode }) {
  return (
    <g
      className={`arch-graph-node${node.kind ? ` arch-graph-node--${node.kind}` : ""}`}
      data-node-id={node.id}
      data-diagram-node=""
      data-kind={node.kind}
    >
      <NodeShape node={node} />
      <foreignObject
        x={node.x + 8}
        y={node.y + 6}
        width={NODE_W - 16}
        height={NODE_H - 12}
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
}: ArchitectureGraphViewProps) {
  const reactId = useId().replace(/:/g, "");
  const layout = useMemo(
    () => layoutProp ?? layoutArchitectureGraph(graph, LAYOUT_OPTS),
    [graph, layoutProp],
  );

  const label =
    ariaLabel ?? (graph.title ? `How ${graph.title} works` : "Architecture diagram");
  const markerId = `arch-graph-arrow-${reactId}`;

  return (
    <div
      className={className}
      data-arch-graph
      data-world-sized={worldSized ? "1" : undefined}
    >
      <svg
        className={`project-diagram-svg arch-graph-svg${svgClassName ? ` ${svgClassName}` : ""}${staticFull ? " is-static-full" : ""}${worldSized ? " is-world-sized" : ""}`}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={worldSized ? layout.width : undefined}
        height={worldSized ? layout.height : undefined}
        role="img"
        aria-label={label}
        data-layout-mode={layout.mode}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
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
            <text className="arch-graph-group-label" x={g.x + 10} y={g.y + 14}>
              {g.label}
            </text>
          </g>
        ))}

        <g className="arch-graph-edges">
          {layout.edges.map((edge) => {
            const d = pointsToPath(edge.points);
            const mid = edge.points[Math.floor(edge.points.length / 2)];
            return (
              <g
                key={edge.id}
                className={`arch-graph-edge${edge.style === "dashed" ? " is-dashed" : ""}${edge.cyclic ? " is-cyclic" : ""}`}
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
            <GraphNode key={node.id} node={node} />
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
