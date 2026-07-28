/**
 * Pure composition layout for architecture graph IR.
 * No Mermaid, no DOM — positions only for the SVG renderer.
 *
 * Groups → vertical pipeline columns (Inputs | Core | Outputs) with
 * intentional asymmetry: satellites stack off-center, spine nodes read larger.
 * No groups → topological ranks left→right with the same weight rules.
 *
 * @see docs/architecture-graph.md
 */

import type {
  ArchitectureGraph,
  ArchitectureGraphEdge,
  ArchitectureGraphNode,
  ArchitectureNodeLayoutHint,
  ArchitectureNodeWeight,
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
  /** Sibling index within the same column / rank cell, top → bottom. */
  stack: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Overview composition weight (chrome / opacity). */
  weight: ArchitectureNodeWeight;
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
  /** `lanes` = group columns; `ranks` = pure topological columns. */
  mode: "lanes" | "ranks";
  width: number;
  height: number;
  nodes: GraphLayoutNode[];
  edges: GraphLayoutEdge[];
  groups: GraphLayoutGroupBox[];
};

export type GraphLayoutOptions = {
  /** Base horizontal gap between columns (group or rank). */
  rankGap?: number;
  /** Extra mul on gaps that touch a core column (breathing room on the spine). */
  spineGapMul?: number;
  /** Ranks-mode gap mul (long topo pipelines need denser packing to stay readable). */
  ranksGapMul?: number;
  /** Reserved for multi-row ranks mode (usually unused). */
  laneGap?: number;
  /** Vertical gap between stacked nodes in a core / ranks column. */
  stackGap?: number;
  /** Tighter vertical gap for ingress/egress satellite stacks. */
  satelliteStackGap?: number;
  /** Base node size before role/kind scale. */
  nodeWidth?: number;
  nodeHeight?: number;
  padding?: number;
  /** Extra top room for group labels in column mode. */
  groupLabelH?: number;
  /** Scale mul for spine-weight nodes (process hubs on the tour). */
  spineScale?: number;
  /** Scale mul for satellite inputs/outputs. */
  satelliteScale?: number;
  /** Extra scale for core-column process nodes. */
  coreProcessScale?: number;
  /** Horizontal stagger for satellite stacks (±px alternating). */
  staggerX?: number;
  /** Ingress column: shift stack toward top (px, negative = up). */
  ingressYBias?: number;
  /** Core column: optical downward bias (px). */
  coreYBias?: number;
  /** Egress column: shift stack toward bottom (px, positive = down). */
  egressYBias?: number;
};

const DEFAULTS: Required<GraphLayoutOptions> = {
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
};

type ColumnRole = "ingress" | "core" | "egress" | "ranks";

function defaultEdgeId(edge: ArchitectureGraphEdge, index: number): string {
  return edge.id ?? `e:${edge.from}->${edge.to}#${index}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
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

/**
 * Groups become left→right pipeline columns.
 * Ungrouped nodes share a trailing column when any node is grouped.
 */
function assignColumns(
  graph: ArchitectureGraph,
): { mode: "lanes" | "ranks"; columnOf: Map<string, number> } {
  const groups = graph.groups ?? [];
  const columnOf = new Map<string, number>();

  if (groups.length === 0) {
    for (const n of graph.nodes) columnOf.set(n.id, 0);
    return { mode: "ranks", columnOf };
  }

  const groupCol = new Map<string, number>();
  groups.forEach((g, i) => groupCol.set(g.id, i));

  const ungroupedCol = groups.length;
  let anyGrouped = false;

  for (const n of graph.nodes) {
    if (n.groupId && groupCol.has(n.groupId)) {
      columnOf.set(n.id, groupCol.get(n.groupId)!);
      anyGrouped = true;
    } else {
      columnOf.set(n.id, ungroupedCol);
    }
  }

  if (!anyGrouped) {
    for (const n of graph.nodes) columnOf.set(n.id, 0);
    return { mode: "ranks", columnOf };
  }

  return { mode: "lanes", columnOf };
}

function roleForColumn(
  col: number,
  maxCol: number,
  mode: "lanes" | "ranks",
): ColumnRole {
  if (mode === "ranks") return "ranks";
  if (maxCol <= 0) return "core";
  if (col === 0) return "ingress";
  if (col >= maxCol) return "egress";
  return "core";
}

/**
 * When there are 4+ columns and the trailing band is thin, demote the
 * penultimate column to egress-like stacking (modes / batch satellites)
 * unless it holds a tour hub (process/store/decision on the path).
 */
function refineColumnRoles(
  maxCol: number,
  mode: "lanes" | "ranks",
  byCol: Map<number, string[]>,
  nodeById: Map<string, ArchitectureGraphNode>,
  tourSet: Set<string>,
): Map<number, ColumnRole> {
  const roles = new Map<number, ColumnRole>();
  for (let c = 0; c <= maxCol; c++) {
    roles.set(c, roleForColumn(c, maxCol, mode));
  }
  if (mode !== "lanes" || maxCol < 3) return roles;

  const trailing = byCol.get(maxCol)?.length ?? 0;
  const pen = maxCol - 1;
  const penIds = byCol.get(pen) ?? [];
  const hasTourHub = penIds.some((id) => {
    if (!tourSet.has(id)) return false;
    const kind = nodeById.get(id)?.kind ?? "other";
    return kind === "process" || kind === "store" || kind === "decision";
  });
  if (trailing <= 2 && !hasTourHub) {
    roles.set(pen, "egress");
  }
  return roles;
}

function resolveWeight(
  node: ArchitectureGraphNode,
  role: ColumnRole,
  tourSet: Set<string>,
  hint?: ArchitectureNodeLayoutHint,
): ArchitectureNodeWeight {
  if (hint?.weight) return hint.weight;

  const kind = node.kind ?? "other";
  const onTour = tourSet.has(node.id);

  if (role === "ingress" || role === "egress") {
    if (kind === "input" || kind === "output") return "satellite";
    if (onTour && (kind === "process" || kind === "store" || kind === "decision")) {
      return "spine";
    }
    return kind === "process" || kind === "store" || kind === "decision"
      ? "normal"
      : "satellite";
  }

  // Core / ranks: tour process/store/decision read as the spine
  if (onTour && (kind === "process" || kind === "store" || kind === "decision")) {
    return "spine";
  }
  if (kind === "input" || kind === "output") return "satellite";
  if (kind === "process" || kind === "store" || kind === "decision") return "normal";
  return "normal";
}

function resolveScale(
  node: ArchitectureGraphNode,
  role: ColumnRole,
  weight: ArchitectureNodeWeight,
  opts: Required<GraphLayoutOptions>,
  hint?: ArchitectureNodeLayoutHint,
): number {
  if (typeof hint?.scale === "number" && Number.isFinite(hint.scale)) {
    return clamp(hint.scale, 0.7, 1.4);
  }

  let scale = 1;
  if (weight === "spine") scale = opts.spineScale;
  else if (weight === "satellite") scale = opts.satelliteScale;

  if (
    role === "core" &&
    (node.kind === "process" || node.kind === "decision") &&
    weight !== "satellite"
  ) {
    scale = Math.max(scale, opts.coreProcessScale);
  }

  // Diamonds need a touch more box for the rotated silhouette
  if (node.kind === "decision" || node.shape === "diamond") {
    scale *= 1.04;
  }

  return clamp(scale, 0.72, 1.35);
}

function stackGapFor(
  role: ColumnRole,
  prevWeight: ArchitectureNodeWeight,
  nextWeight: ArchitectureNodeWeight,
  opts: Required<GraphLayoutOptions>,
): number {
  const base =
    role === "ingress" || role === "egress"
      ? opts.satelliteStackGap
      : opts.stackGap;

  // Extra air around spine pieces so the path breathes
  if (prevWeight === "spine" || nextWeight === "spine") {
    return base * 1.35;
  }
  return base;
}

function columnGap(
  fromRole: ColumnRole,
  toRole: ColumnRole,
  opts: Required<GraphLayoutOptions>,
): number {
  const touchesCore =
    fromRole === "core" ||
    toRole === "core" ||
    (fromRole === "ingress" && toRole === "egress");
  return touchesCore ? opts.rankGap * opts.spineGapMul : opts.rankGap;
}

function alignStackTop(
  role: ColumnRole,
  stackH: number,
  tallest: number,
  topY: number,
  opts: Required<GraphLayoutOptions>,
): number {
  if (role === "ingress") {
    return topY + opts.ingressYBias;
  }
  if (role === "egress") {
    return topY + Math.max(0, tallest - stackH) + opts.egressYBias;
  }
  // core / ranks — centered with slight optical drop
  return topY + (tallest - stackH) / 2 + opts.coreYBias;
}

function edgeRoute(
  from: GraphLayoutNode,
  to: GraphLayoutNode,
  opts: Required<GraphLayoutOptions>,
  cyclic: boolean,
  _dashed: boolean,
  mode: "lanes" | "ranks",
  fanSlot = 0,
  fanCount = 1,
): GraphLayoutPoint[] {
  // Midpoint attachments — arrows read as port→port along the spine
  const y0 = from.y + from.height / 2;
  const y1 = to.y + to.height / 2;
  const x0c = from.x + from.width / 2;
  const x1c = to.x + to.width / 2;

  const sameColumn =
    mode === "lanes" ? from.lane === to.lane : from.rank === to.rank;

  const fanSpread =
    fanCount > 1
      ? (fanSlot - (fanCount - 1) / 2) * Math.min(22, opts.rankGap * 0.08)
      : 0;

  // Forward / lateral travel: orthogonal along Inputs→Core→Outputs
  // (dashed secondary uses the same route; stroke style is CSS-only)
  if (!cyclic && !sameColumn) {
    const goingRight = to.x >= from.x;
    const x0 = goingRight ? from.x + from.width : from.x;
    const x1 = goingRight ? to.x : to.x + to.width;
    const gap = Math.abs(x1 - x0);
    // Prefer a clean mid elbow; fan parallel edges without crossing when ordered
    const midX = x0 + (goingRight ? 1 : -1) * (gap * 0.5) + fanSpread;
    return [
      { x: x0, y: y0 },
      { x: midX, y: y0 },
      { x: midX, y: y1 },
      { x: x1, y: y1 },
    ];
  }

  // Back-edge / cycle: soft arc above (or below if already high) so it
  // doesn’t cut through the spine stack
  if (cyclic) {
    const span = Math.abs(x1c - x0c);
    const bulge = Math.max(48, span * 0.18 + 36);
    const above = Math.min(y0, y1) - opts.padding * 0.35;
    const midY =
      above > opts.padding
        ? Math.min(y0, y1) - bulge
        : Math.max(y0, y1) + bulge;
    const midX = (x0c + x1c) / 2 + fanSpread * 0.4;
    return [
      { x: x0c, y: y0 },
      { x: midX, y: midY },
      { x: x1c, y: y1 },
    ];
  }

  // Same-column sibling link — clear side channel so stacks stay readable
  const preferRight =
    mode === "lanes" ? from.lane < 1 : from.rank < 1;
  const sidePad = Math.min(64, opts.rankGap * 0.28) + Math.abs(fanSpread);
  const side = preferRight
    ? Math.max(from.x + from.width, to.x + to.width) + sidePad
    : Math.min(from.x, to.x) - sidePad;
  const goingDown = y1 >= y0;
  return [
    { x: x0c, y: goingDown ? from.y + from.height : from.y },
    { x: side, y: goingDown ? from.y + from.height : from.y },
    { x: side, y: goingDown ? to.y : to.y + to.height },
    { x: x1c, y: goingDown ? to.y : to.y + to.height },
  ];
}

/**
 * Deterministic composition layout: group columns (pipeline) or topological ranks.
 */
export function layoutArchitectureGraph(
  graph: ArchitectureGraph,
  options: GraphLayoutOptions = {},
): GraphLayoutResult {
  const opts = { ...DEFAULTS, ...options };
  const nodeIds = graph.nodes.map((n) => n.id);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const tourSet = new Set(graph.tour);

  const solidForRank = graph.edges
    .filter((e) => (e.style ?? "solid") === "solid")
    .map((e) => ({ from: e.from, to: e.to }));

  const ranks = computeRanks(nodeIds, solidForRank);
  const { mode, columnOf } = assignColumns(graph);
  const declarationIndex = new Map(graph.nodes.map((n, i) => [n.id, i]));

  // Column membership
  let maxCol = 0;
  const byCol = new Map<number, string[]>();

  if (mode === "lanes") {
    maxCol = Math.max(0, ...nodeIds.map((id) => columnOf.get(id) ?? 0));
    for (let c = 0; c <= maxCol; c++) byCol.set(c, []);
    for (const id of nodeIds) {
      const c = columnOf.get(id) ?? 0;
      byCol.get(c)!.push(id);
    }
    for (const list of byCol.values()) {
      list.sort((a, b) => {
        const ra = ranks.get(a) ?? 0;
        const rb = ranks.get(b) ?? 0;
        if (ra !== rb) return ra - rb;
        return (declarationIndex.get(a) ?? 0) - (declarationIndex.get(b) ?? 0);
      });
    }
  } else {
    // Ranks mode: each topo rank is a column
    maxCol = Math.max(0, ...nodeIds.map((id) => ranks.get(id) ?? 0));
    for (let c = 0; c <= maxCol; c++) byCol.set(c, []);
    for (const id of nodeIds) {
      const c = ranks.get(id) ?? 0;
      columnOf.set(id, c);
      byCol.get(c)!.push(id);
    }
    for (const list of byCol.values()) {
      list.sort(
        (a, b) => (declarationIndex.get(a) ?? 0) - (declarationIndex.get(b) ?? 0),
      );
    }
  }

  // Size + weight per node
  type Sized = {
    id: string;
    width: number;
    height: number;
    weight: ArchitectureNodeWeight;
    hint?: ArchitectureNodeLayoutHint;
    role: ColumnRole;
  };

  const colRoles = refineColumnRoles(maxCol, mode, byCol, nodeById, tourSet);

  const sized = new Map<string, Sized>();
  for (const id of nodeIds) {
    const node = nodeById.get(id)!;
    const col = columnOf.get(id) ?? 0;
    const role = colRoles.get(col) ?? "core";
    const hint = node.layout;
    const weight = resolveWeight(node, role, tourSet, hint);
    const scale = resolveScale(node, role, weight, opts, hint);
    sized.set(id, {
      id,
      width: Math.round(opts.nodeWidth * scale),
      height: Math.round(opts.nodeHeight * scale),
      weight,
      hint,
      role,
    });
  }

  // Column max widths + cumulative X (variable column widths + spine gaps)
  const colMaxW: number[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const list = byCol.get(c) ?? [];
    const w =
      list.length === 0
        ? opts.nodeWidth
        : Math.max(...list.map((id) => sized.get(id)!.width));
    colMaxW.push(w);
  }

  const colX: number[] = [];
  let xCursor = opts.padding;
  for (let c = 0; c <= maxCol; c++) {
    colX.push(xCursor);
    if (c < maxCol) {
      const fromRole = colRoles.get(c) ?? "core";
      const toRole = colRoles.get(c + 1) ?? "core";
      // ranks: denser packing so long ML / topo pipelines stay readable when fitted
      const gap =
        mode === "ranks"
          ? opts.rankGap *
            opts.ranksGapMul *
            (c === 0 || c >= maxCol - 1 ? 1.08 : 1)
          : columnGap(fromRole, toRole, opts);
      xCursor += colMaxW[c] + gap;
    }
  }

  // Stack heights per column
  const colStackH: number[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const list = byCol.get(c) ?? [];
    if (list.length === 0) {
      colStackH.push(opts.nodeHeight);
      continue;
    }
    let h = 0;
    list.forEach((id, i) => {
      h += sized.get(id)!.height;
      if (i < list.length - 1) {
        const prev = sized.get(id)!;
        const next = sized.get(list[i + 1])!;
        h += stackGapFor(prev.role, prev.weight, next.weight, opts);
      }
    });
    colStackH.push(h);
  }

  const tallest = Math.max(opts.nodeHeight, ...colStackH);
  const topY = opts.padding + (mode === "lanes" ? opts.groupLabelH : 0);

  const laidNodes: GraphLayoutNode[] = [];

  for (let c = 0; c <= maxCol; c++) {
    const list = byCol.get(c) ?? [];
    const role = colRoles.get(c) ?? "core";
    const stackH = colStackH[c] ?? opts.nodeHeight;
    let y = alignStackTop(role, stackH, tallest, topY, opts);

    list.forEach((id, stack) => {
      const node = nodeById.get(id)!;
      const s = sized.get(id)!;
      const colW = colMaxW[c] ?? opts.nodeWidth;

      // Center within column band; satellites stagger horizontally
      let x = colX[c] + (colW - s.width) / 2;
      if (role === "ingress" || role === "egress") {
        const dir = role === "ingress" ? -1 : 1;
        x += dir * (stack % 2 === 0 ? opts.staggerX : -opts.staggerX * 0.55);
      } else if (role === "ranks" && list.length > 1) {
        x += (stack % 2 === 0 ? -1 : 1) * opts.staggerX * 0.45;
      }

      // Authored nudges / absolute overrides
      if (typeof s.hint?.dx === "number") x += s.hint.dx;
      if (typeof s.hint?.dy === "number") y += s.hint.dy;
      if (typeof s.hint?.x === "number") x = s.hint.x;
      if (typeof s.hint?.y === "number") y = s.hint.y;

      laidNodes.push({
        id,
        label: node.label,
        kind: node.kind,
        shape: node.shape,
        groupId: node.groupId,
        rank: ranks.get(id) ?? 0,
        lane: mode === "lanes" ? c : 0,
        stack,
        x,
        y,
        width: s.width,
        height: s.height,
        weight: s.weight,
      });

      if (stack < list.length - 1) {
        const next = sized.get(list[stack + 1])!;
        y += s.height + stackGapFor(role, s.weight, next.weight, opts);
        // undo dy nudge for cursor (dy only shifts this node, not the stack)
        if (typeof s.hint?.dy === "number") y -= s.hint.dy;
      }
    });
  }

  const byLayoutId = new Map(laidNodes.map((n) => [n.id, n]));

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

  // Fan slot indices so parallel edges don't share one elbow.
  // Sort by source Y within each fan bucket so routes stay ordered (fewer crossings).
  const fanBuckets = new Map<string, string[]>();
  for (const e of edgeMetas) {
    const from = byLayoutId.get(e.from);
    const to = byLayoutId.get(e.to);
    if (!from || !to) continue;
    const key =
      mode === "lanes"
        ? `L${from.lane}->L${to.lane}:${e.to}`
        : `R${from.rank}->R${to.rank}:${e.to}`;
    const list = fanBuckets.get(key) ?? [];
    list.push(e.key);
    fanBuckets.set(key, list);
  }

  const fanKeyCount = new Map<string, number>();
  const fanKeyIndex = new Map<string, number>();
  for (const [key, keys] of fanBuckets) {
    keys.sort((a, b) => {
      const ea = edgeMetas.find((e) => e.key === a)!;
      const eb = edgeMetas.find((e) => e.key === b)!;
      const ya = byLayoutId.get(ea.from)?.y ?? 0;
      const yb = byLayoutId.get(eb.from)?.y ?? 0;
      if (ya !== yb) return ya - yb;
      return a.localeCompare(b);
    });
    fanKeyCount.set(key, keys.length);
    keys.forEach((k, i) => fanKeyIndex.set(k, i));
  }

  const laidEdges: GraphLayoutEdge[] = edgeMetas.map((e) => {
    const from = byLayoutId.get(e.from)!;
    const to = byLayoutId.get(e.to)!;
    const backEdge =
      mode === "lanes" ? from.lane > to.lane : from.rank > to.rank;
    const cyclic = cyclicKeys.has(e.key) || backEdge;
    const fanKey =
      mode === "lanes"
        ? `L${from.lane}->L${to.lane}:${e.to}`
        : `R${from.rank}->R${to.rank}:${e.to}`;
    return {
      id: e.key,
      from: e.from,
      to: e.to,
      label: e.label,
      style: e.style,
      cyclic,
      points: edgeRoute(
        from,
        to,
        opts,
        cyclic,
        e.style === "dashed",
        mode,
        fanKeyIndex.get(e.key) ?? 0,
        fanKeyCount.get(fanKey) ?? 1,
      ),
    };
  });

  const groups: GraphLayoutGroupBox[] = [];
  if (mode === "lanes") {
    for (const g of graph.groups ?? []) {
      const members = laidNodes.filter((n) => n.groupId === g.id);
      if (members.length === 0) continue;
      const minX = Math.min(...members.map((n) => n.x)) - 18;
      const minY = Math.min(...members.map((n) => n.y)) - opts.groupLabelH;
      const maxX = Math.max(...members.map((n) => n.x + n.width)) + 18;
      const maxY = Math.max(...members.map((n) => n.y + n.height)) + 16;
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
  }

  const edgeXs = laidEdges.flatMap((e) => e.points.map((p) => p.x));
  const edgeYs = laidEdges.flatMap((e) => e.points.map((p) => p.y));
  const groupXs = groups.flatMap((g) => [g.x, g.x + g.width]);
  const groupYs = groups.flatMap((g) => [g.y, g.y + g.height]);

  const minX = Math.min(
    ...laidNodes.map((n) => n.x),
    ...(edgeXs.length ? edgeXs : [opts.padding]),
    ...(groupXs.length ? groupXs : [opts.padding]),
    opts.padding,
  );
  const minY = Math.min(
    ...laidNodes.map((n) => n.y),
    ...(edgeYs.length ? edgeYs : [0]),
    ...(groupYs.length ? groupYs : [0]),
    0,
  );

  // Keep viewBox 0-origin when edge arcs / nudges go negative
  const shiftX = minX < 0 ? -minX : 0;
  const shiftY = minY < 0 ? -minY : 0;
  if (shiftX || shiftY) {
    for (const n of laidNodes) {
      n.x += shiftX;
      n.y += shiftY;
    }
    for (const e of laidEdges) {
      for (const p of e.points) {
        p.x += shiftX;
        p.y += shiftY;
      }
    }
    for (const g of groups) {
      g.x += shiftX;
      g.y += shiftY;
    }
  }

  const maxX = Math.max(
    ...laidNodes.map((n) => n.x + n.width),
    ...laidEdges.flatMap((e) => e.points.map((p) => p.x)),
    ...groups.map((g) => g.x + g.width),
    opts.nodeWidth,
  );
  const maxY = Math.max(
    ...laidNodes.map((n) => n.y + n.height),
    ...laidEdges.flatMap((e) => e.points.map((p) => p.y)),
    ...groups.map((g) => g.y + g.height),
    opts.nodeHeight,
  );
  const width = Math.max(maxX, xCursor + (colMaxW[maxCol] ?? 0) + shiftX) + opts.padding;
  const height = maxY + opts.padding;

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
