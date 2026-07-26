/**
 * Pure rank / lane layout for architecture graph IR.
 * No Mermaid, no DOM — positions only for a later SVG renderer.
 *
 * @see docs/architecture-graph.md
 */

import type {
  ArchitectureGraph,
  ArchitectureGraphEdge,
  ArchitectureGraphNode,
} from "@/lib/architecture-graph";

export type GraphLayoutPoint = { x: number; y: number };

export type GraphLayoutNode = {
  id: string;
  label: string;
  kind?: ArchitectureGraphNode["kind"];
  shape?: ArchitectureGraphNode["shape"];
  groupId?: string;
  rank: number;
  lane: number;
  /** Sibling index within the same (rank, lane) cell, top → bottom. */
  stack: number;
  x: number;
  y: number;
};

export type GraphLayoutEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  style: NonNullable<ArchitectureGraphEdge["style"]>;
  /** True when this edge closes or participates in a cycle (back-edge in DFS). */
  cyclic: boolean;
  points: GraphLayoutPoint[];
};

export type GraphLayoutGroupBox = {
  id: string;
  label: string;
  lane: number;
  minRank: number;
  maxRank: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GraphLayoutResult = {
  mode: "lanes" | "ranks";
  width: number;
  height: number;
  nodes: GraphLayoutNode[];
  edges: GraphLayoutEdge[];
  groups: GraphLayoutGroupBox[];
};

export type GraphLayoutOptions = {
  rankGap?: number;
  laneGap?: number;
  stackGap?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  padding?: number;
};

const DEFAULTS: Required<GraphLayoutOptions> = {
  rankGap: 160,
  laneGap: 200,
  stackGap: 72,
  nodeWidth: 140,
  nodeHeight: 48,
  padding: 48,
};

function defaultEdgeId(edge: ArchitectureGraphEdge, index: number): string {
  return edge.id ?? `e:${edge.from}->${edge.to}#${index}`;
}

/** Kahn topo ranks; nodes in cycles get the max predecessor rank + 1 (best-effort). */
function computeRanks(
  nodeIds: string[],
  solidEdges: Array<{ from: string; to: string }>,
): Map<string, number> {
  const ids = new Set(nodeIds);
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    indegree.set(id, 0);
    adj.set(id, []);
  }

  for (const e of solidEdges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) continue;
    adj.get(e.from)!.push(e.to);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }

  const rank = new Map<string, number>();
  const queue: string[] = [];

  for (const id of nodeIds) {
    if ((indegree.get(id) ?? 0) === 0) {
      queue.push(id);
      rank.set(id, 0);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const r = rank.get(cur) ?? 0;
    for (const next of adj.get(cur) ?? []) {
      const nextRank = Math.max(rank.get(next) ?? 0, r + 1);
      rank.set(next, nextRank);
      const deg = (indegree.get(next) ?? 1) - 1;
      indegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  // Leftover cyclic nodes: place after max known predecessor
  for (const id of nodeIds) {
    if (rank.has(id)) continue;
    let best = 0;
    for (const e of solidEdges) {
      if (e.to === id && rank.has(e.from)) {
        best = Math.max(best, (rank.get(e.from) ?? 0) + 1);
      }
    }
    rank.set(id, best);
  }

  return rank;
}

function findCyclicEdgeKeys(
  nodeIds: string[],
  edges: Array<{ from: string; to: string; key: string }>,
): Set<string> {
  const adj = new Map<string, Array<{ to: string; key: string }>>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.from)?.push({ to: e.to, key: e.key });
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);

  const cyclic = new Set<string>();

  function dfs(u: string): void {
    color.set(u, GRAY);
    for (const { to, key } of adj.get(u) ?? []) {
      const c = color.get(to) ?? WHITE;
      if (c === GRAY) {
        cyclic.add(key);
      } else if (c === WHITE) {
        dfs(to);
      }
    }
    color.set(u, BLACK);
  }

  for (const id of nodeIds) {
    if ((color.get(id) ?? WHITE) === WHITE) dfs(id);
  }

  return cyclic;
}

function assignLanes(
  graph: ArchitectureGraph,
): { mode: "lanes" | "ranks"; laneOf: Map<string, number> } {
  const groups = graph.groups ?? [];
  const laneOf = new Map<string, number>();

  if (groups.length === 0) {
    for (const n of graph.nodes) laneOf.set(n.id, 0);
    return { mode: "ranks", laneOf };
  }

  const groupLane = new Map<string, number>();
  groups.forEach((g, i) => groupLane.set(g.id, i));

  // Ungrouped nodes share an extra lane after groups (or 0 if none grouped)
  const ungroupedLane = groups.length;
  let anyGrouped = false;

  for (const n of graph.nodes) {
    if (n.groupId && groupLane.has(n.groupId)) {
      laneOf.set(n.id, groupLane.get(n.groupId)!);
      anyGrouped = true;
    } else {
      laneOf.set(n.id, ungroupedLane);
    }
  }

  if (!anyGrouped) {
    for (const n of graph.nodes) laneOf.set(n.id, 0);
    return { mode: "ranks", laneOf };
  }

  return { mode: "lanes", laneOf };
}

function edgeRoute(
  from: GraphLayoutNode,
  to: GraphLayoutNode,
  opts: Required<GraphLayoutOptions>,
  cyclic: boolean,
  dashed: boolean,
): GraphLayoutPoint[] {
  const x0 = from.x + opts.nodeWidth / 2;
  const y0 = from.y + opts.nodeHeight / 2;
  const x1 = to.x + opts.nodeWidth / 2;
  const y1 = to.y + opts.nodeHeight / 2;

  if (!cyclic && from.rank !== to.rank) {
    // Orthogonal elbow through mid-rank
    const midX = (x0 + x1) / 2;
    return [
      { x: x0, y: y0 },
      { x: midX, y: y0 },
      { x: midX, y: y1 },
      { x: x1, y: y1 },
    ];
  }

  if (cyclic || dashed) {
    // Arc above the nodes so back-edges / dashed links stay readable
    const bulge = Math.max(40, Math.abs(y1 - y0) * 0.35 + 36);
    const midX = (x0 + x1) / 2;
    const midY = Math.min(y0, y1) - bulge;
    return [
      { x: x0, y: y0 },
      { x: midX, y: midY },
      { x: x1, y: y1 },
    ];
  }

  // Same rank sibling link
  const midY = (y0 + y1) / 2;
  return [
    { x: x0, y: y0 },
    { x: x0, y: midY },
    { x: x1, y: midY },
    { x: x1, y: y1 },
  ];
}

/**
 * Compute a deterministic left→right rank layout (lanes as parallel rows when groups exist).
 */
export function layoutArchitectureGraph(
  graph: ArchitectureGraph,
  options: GraphLayoutOptions = {},
): GraphLayoutResult {
  const opts = { ...DEFAULTS, ...options };
  const nodeIds = graph.nodes.map((n) => n.id);

  const solidForRank = graph.edges
    .filter((e) => (e.style ?? "solid") === "solid")
    .map((e) => ({ from: e.from, to: e.to }));

  const ranks = computeRanks(nodeIds, solidForRank);
  const { mode, laneOf } = assignLanes(graph);

  // Stack siblings that share (rank, lane)
  const cellKeys = new Map<string, string[]>();
  for (const id of nodeIds) {
    const key = `${ranks.get(id) ?? 0}:${laneOf.get(id) ?? 0}`;
    const list = cellKeys.get(key) ?? [];
    list.push(id);
    cellKeys.set(key, list);
  }

  // Stable stack order: declaration order in graph.nodes
  const declarationIndex = new Map(graph.nodes.map((n, i) => [n.id, i]));
  for (const list of cellKeys.values()) {
    list.sort((a, b) => (declarationIndex.get(a) ?? 0) - (declarationIndex.get(b) ?? 0));
  }

  const stackOf = new Map<string, number>();
  for (const list of cellKeys.values()) {
    list.forEach((id, i) => stackOf.set(id, i));
  }

  const maxStackInCell = new Map<string, number>();
  for (const [key, list] of cellKeys) {
    maxStackInCell.set(key, list.length);
  }

  // Column height: tallest stack at each rank (across lanes)
  const maxRank = Math.max(0, ...nodeIds.map((id) => ranks.get(id) ?? 0));
  const maxLane = Math.max(0, ...nodeIds.map((id) => laneOf.get(id) ?? 0));

  const laneStackHeight = (lane: number, rank: number): number => {
    const n = maxStackInCell.get(`${rank}:${lane}`) ?? 1;
    return n * opts.nodeHeight + (n - 1) * opts.stackGap;
  };

  const laneHeights: number[] = [];
  for (let lane = 0; lane <= maxLane; lane++) {
    let h = opts.nodeHeight;
    for (let rank = 0; rank <= maxRank; rank++) {
      h = Math.max(h, laneStackHeight(lane, rank));
    }
    laneHeights.push(h);
  }

  const laneY0: number[] = [];
  let yCursor = opts.padding;
  for (let lane = 0; lane <= maxLane; lane++) {
    laneY0.push(yCursor);
    yCursor += laneHeights[lane] + opts.laneGap;
  }

  const laidNodes: GraphLayoutNode[] = graph.nodes.map((n) => {
    const rank = ranks.get(n.id) ?? 0;
    const lane = laneOf.get(n.id) ?? 0;
    const stack = stackOf.get(n.id) ?? 0;
    const cellCount = maxStackInCell.get(`${rank}:${lane}`) ?? 1;
    const cellH = cellCount * opts.nodeHeight + (cellCount - 1) * opts.stackGap;
    const cellTop = laneY0[lane] + (laneHeights[lane] - cellH) / 2;

    const x = opts.padding + rank * opts.rankGap;
    const y = cellTop + stack * (opts.nodeHeight + opts.stackGap);

    return {
      id: n.id,
      label: n.label,
      kind: n.kind,
      shape: n.shape,
      groupId: n.groupId,
      rank,
      lane,
      stack,
      x,
      y,
    };
  });

  const byId = new Map(laidNodes.map((n) => [n.id, n]));

  const edgeMetas = graph.edges.map((e, i) => ({
    from: e.from,
    to: e.to,
    key: defaultEdgeId(e, i),
    style: (e.style ?? "solid") as "solid" | "dashed",
    label: e.label,
  }));

  const cyclicKeys = findCyclicEdgeKeys(
    nodeIds,
    edgeMetas.map((e) => ({ from: e.from, to: e.to, key: e.key })),
  );

  const laidEdges: GraphLayoutEdge[] = edgeMetas.map((e) => {
    const from = byId.get(e.from)!;
    const to = byId.get(e.to)!;
    const cyclic = cyclicKeys.has(e.key) || from.rank > to.rank;
    return {
      id: e.key,
      from: e.from,
      to: e.to,
      label: e.label,
      style: e.style,
      cyclic,
      points: edgeRoute(from, to, opts, cyclic, e.style === "dashed"),
    };
  });

  const groups: GraphLayoutGroupBox[] = [];
  for (const g of graph.groups ?? []) {
    const members = laidNodes.filter((n) => n.groupId === g.id);
    if (members.length === 0) continue;
    const minX = Math.min(...members.map((n) => n.x)) - 16;
    const minY = Math.min(...members.map((n) => n.y)) - 28;
    const maxX = Math.max(...members.map((n) => n.x + opts.nodeWidth)) + 16;
    const maxY = Math.max(...members.map((n) => n.y + opts.nodeHeight)) + 16;
    groups.push({
      id: g.id,
      label: g.label,
      lane: members[0].lane,
      minRank: Math.min(...members.map((n) => n.rank)),
      maxRank: Math.max(...members.map((n) => n.rank)),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }

  const width =
    opts.padding * 2 + maxRank * opts.rankGap + opts.nodeWidth;
  const height = yCursor - opts.laneGap + opts.padding;

  return { mode, width, height, nodes: laidNodes, edges: laidEdges, groups };
}

/** Matrix row helper for docs / validation scripts. */
export function summarizeGraphLayout(graph: ArchitectureGraph): {
  nodeCount: number;
  tourStops: number;
  layoutMode: "lanes" | "ranks";
} {
  const layout = layoutArchitectureGraph(graph);
  return {
    nodeCount: graph.nodes.length,
    tourStops: graph.tour.length,
    layoutMode: layout.mode,
  };
}
