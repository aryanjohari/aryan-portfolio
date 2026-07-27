/**
 * Camera targets + fan-in/out beats for the architecture scroll journey.
 * Layout gives world coordinates; the viewport is a camera (translate + scale).
 *
 * Timeline shape (scrubbed, ease none):
 *   dive → hold stop0 → travel → hold stop1 → … → hold stopN
 * Snap lands on each hold; focus opacity/classes are owned by one applyFocus call.
 */

import type {
  ArchitectureGraph,
  ArchitectureTourCaption,
} from "@/lib/architecture-graph";
import {
  layoutArchitectureGraph,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  type GraphLayoutResult,
} from "@/lib/architecture-graph-layout";

export const JOURNEY_LAYOUT = {
  rankGap: 148,
  laneGap: 100,
  stackGap: 52,
  nodeWidth: 132,
  nodeHeight: 44,
  padding: 32,
} as const;

/** Pin / scrub tunables — skimmable void dive, not a 10-screen prison. */
export const JOURNEY = {
  /** Base viewport-heights of pin scroll; scaled by tour length. */
  pinVhBase: 0.72,
  pinVhPerHop: 0.36,
  pinVhMin: 1.0,
  pinVhMax: 2.2,
  /** Soft catch-up so scrub doesn’t feel locked to the wheel. */
  scrub: 0.75,
  /** Align under site chrome; hero exit + void hand off into this pin. */
  pinStart: "top top+=56",
  /** Timeline duration units per stop beat (hold + optional travel after). */
  beatDur: 1,
  /**
   * One node owns the frame: target ~56% of viewport width.
   * focusScaleMax must be high enough that wide desktops still hit this frac.
   */
  focusNodeFrac: 0.56,
  focusScaleMin: 1.45,
  focusScaleMax: 4.4,
  /** Opening dive: wider empty peek → first stop (share of one beatDur). */
  diveFrac: 0.38,
  diveFromScaleMul: 0.38,
  /** Within a beat after the first: hold readable pose, then travel to next. */
  holdFrac: 0.42,
  travelFrac: 0.58,
  /** Cluster / fan framing is slightly tighter than a full-map dump. */
  clusterFrac: 0.72,
  widePad: 56,
  /** Dim non-focused hard so one node owns the screen. */
  nodeDim: 0.035,
  nodeNear: 0.22,
  nodeFull: 1,
  edgeDim: 0.02,
  edgeNear: 0.22,
  edgeFull: 0.95,
  /** Snap: short directional settle onto each hold. */
  snapDurationMin: 0.12,
  snapDurationMax: 0.32,
  snapDelay: 0.02,
} as const;

export type CameraPose = {
  x: number;
  y: number;
  scale: number;
};

export type ViewportSize = { width: number; height: number };

export type JourneyStopKind = "node" | "edge" | "cluster";

export type JourneyStop = {
  index: number;
  /** Tour id (node or edge). */
  id: string;
  kind: JourneyStopKind;
  /** Primary node for class spotlight (hub or representative). */
  focusNodeId: string;
  /** All nodes that should read as “here” (cluster siblings or single). */
  spotlightIds: string[];
  pose: CameraPose;
  label: string;
};

export type JourneyHop = {
  /** Tour index of the destination stop. */
  toIndex: number;
  fromId: string;
  toId: string;
  fromKind: JourneyStopKind;
  toKind: JourneyStopKind;
  /** Primary edge for packet / active stroke (first hop edge). */
  edgeId: string | null;
  /** All solid edges along the travel path (may span skipped nodes). */
  edgeIds: string[];
  fanOut: boolean;
  fanIn: boolean;
  /** Nodes visible during a fan beat (hub + siblings). */
  fanNodeIds: string[];
  fromPose: CameraPose;
  toPose: CameraPose;
  label: string;
};

export type JourneyCaption = {
  id: string;
  title: string;
  body: string;
  items?: string[];
  kind: JourneyStopKind;
};

export type JourneyPlan = {
  layout: GraphLayoutResult;
  stops: JourneyStop[];
  hops: JourneyHop[];
  /** Initial focus (tour[0]). */
  startPose: CameraPose;
  /** Wider void peek used for the opening dive into startPose. */
  diveFromPose: CameraPose;
  startNodeId: string;
  startLabel: string;
  pinVh: number;
  /** Timeline length in beat units (dive + n holds + n-1 travels). */
  duration: number;
  /** Progress [0..1] at each stop’s hold end (snap targets). */
  snapProgress: number[];
  captions: JourneyCaption[];
};

function edgeKey(
  edge: { id?: string; from: string; to: string },
  index: number,
): string {
  return edge.id ?? `e:${edge.from}->${edge.to}#${index}`;
}

export function layoutForJourney(graph: ArchitectureGraph): GraphLayoutResult {
  return layoutArchitectureGraph(graph, JOURNEY_LAYOUT);
}

export function nodeCenter(
  node: GraphLayoutNode,
  nodeWidth = JOURNEY_LAYOUT.nodeWidth,
  nodeHeight = JOURNEY_LAYOUT.nodeHeight,
): { x: number; y: number } {
  return {
    x: node.x + nodeWidth / 2,
    y: node.y + nodeHeight / 2,
  };
}

export function poseForPoint(
  cx: number,
  cy: number,
  scale: number,
  viewport: ViewportSize,
): CameraPose {
  return {
    x: viewport.width / 2 - cx * scale,
    y: viewport.height / 2 - cy * scale,
    scale,
  };
}

export function focusScaleForViewport(viewport: ViewportSize): number {
  const raw = (viewport.width * JOURNEY.focusNodeFrac) / JOURNEY_LAYOUT.nodeWidth;
  return Math.min(JOURNEY.focusScaleMax, Math.max(JOURNEY.focusScaleMin, raw));
}

function boundsOfNodes(
  nodes: GraphLayoutNode[],
  pad: number,
): { cx: number; cy: number; width: number; height: number } {
  const nw = JOURNEY_LAYOUT.nodeWidth;
  const nh = JOURNEY_LAYOUT.nodeHeight;
  const minX = Math.min(...nodes.map((n) => n.x)) - pad;
  const minY = Math.min(...nodes.map((n) => n.y)) - pad;
  const maxX = Math.max(...nodes.map((n) => n.x + nw)) + pad;
  const maxY = Math.max(...nodes.map((n) => n.y + nh)) + pad;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function widePoseForNodes(
  nodes: GraphLayoutNode[],
  viewport: ViewportSize,
  pad = JOURNEY.widePad,
  fillFrac = JOURNEY.clusterFrac,
): CameraPose {
  const b = boundsOfNodes(nodes, pad);
  const sx = (viewport.width * fillFrac) / b.width;
  const sy = (viewport.height * fillFrac) / b.height;
  const scale = Math.min(sx, sy, focusScaleForViewport(viewport) * 0.85);
  return poseForPoint(b.cx, b.cy, Math.max(0.4, scale), viewport);
}

export function poseForNode(
  node: GraphLayoutNode,
  viewport: ViewportSize,
  scale = focusScaleForViewport(viewport),
): CameraPose {
  const c = nodeCenter(node);
  return poseForPoint(c.x, c.y, scale, viewport);
}

/** Midpoint along a layout edge path (for travel framing). */
export function edgeMidpoint(edge: GraphLayoutEdge): { x: number; y: number } {
  const pts = edge.points;
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  const mid = Math.floor(pts.length / 2);
  if (pts.length === 3) {
    const [a, b, c] = pts;
    return {
      x: 0.25 * a.x + 0.5 * b.x + 0.25 * c.x,
      y: 0.25 * a.y + 0.5 * b.y + 0.25 * c.y,
    };
  }
  return pts[mid] ?? pts[0];
}

type DegreeMaps = {
  inbound: Map<string, string[]>;
  outbound: Map<string, string[]>;
  edgeByEnds: Map<string, string>;
  edgeById: Map<string, GraphLayoutEdge>;
  nodeById: Map<string, GraphLayoutNode>;
};

function buildDegreeMaps(
  graph: ArchitectureGraph,
  layout: GraphLayoutResult,
): DegreeMaps {
  const inbound = new Map<string, string[]>();
  const outbound = new Map<string, string[]>();
  const edgeByEnds = new Map<string, string>();
  const edgeById = new Map(layout.edges.map((e) => [e.id, e]));
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  for (const n of graph.nodes) {
    inbound.set(n.id, []);
    outbound.set(n.id, []);
  }

  graph.edges.forEach((e, i) => {
    if ((e.style ?? "solid") !== "solid") return;
    const id = edgeKey(e, i);
    inbound.get(e.to)?.push(e.from);
    outbound.get(e.from)?.push(e.to);
    edgeByEnds.set(`${e.from}->${e.to}`, id);
    const laid = layout.edges.find(
      (le) => le.from === e.from && le.to === e.to && le.style === "solid",
    );
    if (laid) edgeByEnds.set(`${e.from}->${e.to}`, laid.id);
  });

  return { inbound, outbound, edgeByEnds, edgeById, nodeById };
}

/**
 * Fan-in: target has ≥2 solid inbound edges.
 * Fan-out: source has ≥2 solid outbound edges.
 */
export function detectFan(
  degrees: DegreeMaps,
  fromId: string,
  toId: string,
): { fanOut: boolean; fanIn: boolean; fanNodeIds: string[] } {
  const outs = degrees.outbound.get(fromId) ?? [];
  const inns = degrees.inbound.get(toId) ?? [];
  const fanOut = outs.length >= 2;
  const fanIn = inns.length >= 2;
  const fanNodeIds = new Set<string>();

  if (fanOut) {
    fanNodeIds.add(fromId);
    for (const t of outs) fanNodeIds.add(t);
  }
  if (fanIn) {
    fanNodeIds.add(toId);
    for (const s of inns) fanNodeIds.add(s);
  }

  return { fanOut, fanIn, fanNodeIds: [...fanNodeIds] };
}

function resolveStop(
  stopId: string,
  degrees: DegreeMaps,
  graph: ArchitectureGraph,
): {
  kind: "node" | "edge";
  focusNodeId: string;
  label: string;
  edgeId: string | null;
} {
  const node = degrees.nodeById.get(stopId);
  if (node) {
    return {
      kind: "node",
      focusNodeId: node.id,
      label: node.label,
      edgeId: null,
    };
  }

  const edge =
    degrees.edgeById.get(stopId) ??
    graph.edges
      .map((e, i) => ({ e, id: edgeKey(e, i) }))
      .find((x) => x.id === stopId)?.e;

  if (edge) {
    const laid =
      degrees.edgeById.get(stopId) ??
      [...degrees.edgeById.values()].find(
        (le) => le.from === edge.from && le.to === edge.to,
      );
    const toNode = degrees.nodeById.get(edge.to);
    const fromNode = degrees.nodeById.get(edge.from);
    const label =
      edge.label?.trim() ||
      (fromNode && toNode
        ? `${fromNode.label} → ${toNode.label}`
        : `${edge.from} → ${edge.to}`);
    return {
      kind: "edge",
      focusNodeId: edge.to,
      label,
      edgeId: laid?.id ?? stopId,
    };
  }

  return {
    kind: "node",
    focusNodeId: stopId,
    label: stopId,
    edgeId: null,
  };
}

function findConnectingEdge(
  fromNodeId: string,
  toNodeId: string,
  degrees: DegreeMaps,
): string | null {
  return (
    degrees.edgeByEnds.get(`${fromNodeId}->${toNodeId}`) ??
    degrees.edgeByEnds.get(`${toNodeId}->${fromNodeId}`) ??
    null
  );
}

/** Shortest solid-edge path (node ids). Empty if none. */
function findNodePath(
  fromNodeId: string,
  toNodeId: string,
  degrees: DegreeMaps,
): string[] {
  if (fromNodeId === toNodeId) return [fromNodeId];
  const queue = [fromNodeId];
  const prev = new Map<string, string | null>([[fromNodeId, null]]);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const nexts = degrees.outbound.get(cur) ?? [];
    for (const n of nexts) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === toNodeId) {
        const path = [toNodeId];
        let p: string | null = cur;
        while (p) {
          path.push(p);
          p = prev.get(p) ?? null;
        }
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return [];
}

function edgesAlongPath(nodePath: string[], degrees: DegreeMaps): string[] {
  const edges: string[] = [];
  for (let i = 0; i < nodePath.length - 1; i++) {
    const eid = degrees.edgeByEnds.get(`${nodePath[i]}->${nodePath[i + 1]}`);
    if (eid) edges.push(eid);
  }
  return edges;
}

export function pinVhForTour(tourLength: number): number {
  const hops = Math.max(0, tourLength - 1);
  const raw = JOURNEY.pinVhBase + hops * JOURNEY.pinVhPerHop;
  return Math.min(JOURNEY.pinVhMax, Math.max(JOURNEY.pinVhMin, raw));
}

function captionMap(graph: ArchitectureGraph): Map<string, ArchitectureTourCaption> {
  return new Map((graph.captions ?? []).map((c) => [c.id, c]));
}

/**
 * Group siblings for a tour stop when the caption has `items` (cluster beat)
 * or the node shares a group with ≥2 members.
 */
function clusterNodesForStop(
  focusNodeId: string,
  graph: ArchitectureGraph,
  degrees: DegreeMaps,
  caption: ArchitectureTourCaption | undefined,
): GraphLayoutNode[] {
  const focus = degrees.nodeById.get(focusNodeId);
  if (!focus || !caption?.items || caption.items.length < 2) return [];

  const byGroup = focus.groupId
    ? graph.nodes
        .filter((n) => n.groupId === focus.groupId)
        .map((n) => degrees.nodeById.get(n.id))
        .filter((n): n is GraphLayoutNode => Boolean(n))
    : [];

  if (byGroup.length >= 2) return byGroup;

  // Fan-out from this node
  const outs = degrees.outbound.get(focusNodeId) ?? [];
  if (outs.length >= 2) {
    const fan = [
      focus,
      ...outs.map((id) => degrees.nodeById.get(id)).filter(Boolean),
    ] as GraphLayoutNode[];
    if (fan.length >= 2) return fan;
  }

  // Fan-in into this node
  const inns = degrees.inbound.get(focusNodeId) ?? [];
  if (inns.length >= 2) {
    const fan = [
      focus,
      ...inns.map((id) => degrees.nodeById.get(id)).filter(Boolean),
    ] as GraphLayoutNode[];
    if (fan.length >= 2) return fan;
  }

  // Co-targets: share a predecessor that fans out (e.g. eval + xai from ckpt)
  for (const pred of inns) {
    const siblings = degrees.outbound.get(pred) ?? [];
    if (siblings.length >= 2) {
      const fan = siblings
        .map((id) => degrees.nodeById.get(id))
        .filter((n): n is GraphLayoutNode => Boolean(n));
      if (fan.length >= 2) return fan;
    }
  }

  return [];
}

/**
 * Build camera hops from layout + `graph.tour`.
 * Hold/travel beats + snapProgress align so scroll rests on readable frames.
 */
export function planArchitectureJourney(
  graph: ArchitectureGraph,
  viewport: ViewportSize,
): JourneyPlan {
  const layout = layoutForJourney(graph);
  const degrees = buildDegreeMaps(graph, layout);
  const focusScale = focusScaleForViewport(viewport);
  const tour = graph.tour;
  const captionsById = captionMap(graph);

  const stops: JourneyStop[] = [];
  const captions: JourneyCaption[] = [];

  for (let i = 0; i < tour.length; i++) {
    const id = tour[i];
    const resolved = resolveStop(id, degrees, graph);
    const authored = captionsById.get(id);
    const focusNode = degrees.nodeById.get(resolved.focusNodeId);
    const cluster = clusterNodesForStop(
      resolved.focusNodeId,
      graph,
      degrees,
      authored,
    );
    const isCluster = cluster.length >= 2;
    const pose =
      isCluster && focusNode
        ? widePoseForNodes(cluster, viewport)
        : focusNode
          ? poseForNode(focusNode, viewport, focusScale)
          : { x: 0, y: 0, scale: 1 };

    const kind: JourneyStopKind = isCluster
      ? "cluster"
      : resolved.kind === "edge"
        ? "edge"
        : "node";

    stops.push({
      index: i,
      id,
      kind,
      focusNodeId: resolved.focusNodeId,
      spotlightIds: isCluster
        ? cluster.map((n) => n.id)
        : [resolved.focusNodeId],
      pose,
      label: authored?.title ?? resolved.label,
    });

    captions.push({
      id,
      title: authored?.title ?? resolved.label,
      body:
        authored?.body ??
        (i === 0 && graph.summary ? graph.summary : "Next stage in the path."),
      items: authored?.items,
      kind,
    });
  }

  const first = stops[0];
  const startPose = first?.pose ?? { x: 0, y: 0, scale: 1 };
  const startNode = degrees.nodeById.get(first?.focusNodeId ?? "") ?? layout.nodes[0];
  const diveFromPose = startNode
    ? poseForNode(
        startNode,
        viewport,
        Math.max(
          JOURNEY.focusScaleMin * 0.5,
          focusScale * JOURNEY.diveFromScaleMul,
        ),
      )
    : startPose;

  const hops: JourneyHop[] = [];

  for (let i = 1; i < tour.length; i++) {
    const prev = resolveStop(tour[i - 1], degrees, graph);
    const next = resolveStop(tour[i], degrees, graph);
    const fromStop = stops[i - 1];
    const toStop = stops[i];

    const fromNodeId =
      prev.kind === "edge"
        ? (degrees.edgeById.get(prev.edgeId ?? "")?.from ?? prev.focusNodeId)
        : prev.focusNodeId;
    const toNodeId = next.focusNodeId;

    const fromNode = degrees.nodeById.get(fromNodeId);
    const toNode = degrees.nodeById.get(toNodeId);
    if (!fromNode || !toNode || !fromStop || !toStop) continue;

    const edgeId =
      next.edgeId ??
      prev.edgeId ??
      findConnectingEdge(fromNodeId, toNodeId, degrees);

    const nodePath =
      edgeId || next.kind === "edge" || prev.kind === "edge"
        ? []
        : findNodePath(fromNodeId, toNodeId, degrees);
    const pathEdges = edgeId ? [edgeId] : edgesAlongPath(nodePath, degrees);
    const primaryEdge = pathEdges[0] ?? null;

    const { fanOut, fanIn, fanNodeIds } = detectFan(degrees, fromNodeId, toNodeId);

    hops.push({
      toIndex: i,
      fromId: fromNodeId,
      toId: toNodeId,
      fromKind: fromStop.kind,
      toKind: toStop.kind,
      edgeId: primaryEdge,
      edgeIds: pathEdges,
      fanOut,
      fanIn,
      fanNodeIds,
      fromPose: fromStop.pose,
      toPose: toStop.pose,
      label: toStop.label,
    });
  }

  // Timeline: dive + hold0 + (travel + hold)* + tiny settle
  const beat = JOURNEY.beatDur;
  const diveDur = beat * JOURNEY.diveFrac;
  const holdDur = beat * JOURNEY.holdFrac;
  const travelDur = beat * JOURNEY.travelFrac;
  const n = Math.max(stops.length, 1);
  const settleDur = 0.08;
  const duration =
    diveDur + holdDur + Math.max(0, n - 1) * (travelDur + holdDur) + settleDur;

  const snapProgress: number[] = [];
  let t = diveDur + holdDur;
  snapProgress.push(Math.min(1, t / duration));
  for (let i = 1; i < n; i++) {
    t += travelDur + holdDur;
    snapProgress.push(Math.min(1, t / duration));
  }

  return {
    layout,
    stops,
    hops,
    startPose,
    diveFromPose,
    startNodeId: startNode?.id ?? first?.focusNodeId ?? "",
    startLabel: first?.label ?? "",
    pinVh: pinVhForTour(tour.length),
    duration,
    snapProgress,
    captions,
  };
}

/**
 * Map scrub progress → stop index.
 * Stay on stop i until past the midpoint between snap i and i+1
 * so travel doesn't flicker focus / captions mid-hop.
 */
export function stopIndexForProgress(
  progress: number,
  snapProgress: number[],
): number {
  if (snapProgress.length === 0) return 0;
  if (snapProgress.length === 1) return 0;
  if (progress <= snapProgress[0]) return 0;
  for (let i = 0; i < snapProgress.length - 1; i++) {
    const mid = (snapProgress[i] + snapProgress[i + 1]) / 2;
    if (progress < mid) return i;
  }
  return snapProgress.length - 1;
}

/** Nodes/edges that should be near-visible for a hop's fan beat. */
export function hopSpotlight(
  hop: JourneyHop,
  phase: "from" | "to",
): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>();
  const edges = new Set<string>();

  if (phase === "from") {
    nodes.add(hop.fromId);
  } else {
    nodes.add(hop.toId);
    if (hop.edgeId) edges.add(hop.edgeId);
    nodes.add(hop.fromId);
  }

  return { nodes, edges };
}
