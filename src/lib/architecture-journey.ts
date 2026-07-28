/**
 * Architecture presentation planning.
 *
 * Default page UX is overview-story: fit the whole graph, teach via captions.
 * Optional dive mode uses camera poses (planDiveJourney) for on-demand focus.
 *
 * Legacy scrub timeline (pin + camera travel) is no longer the default experience.
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
  /** Base gap between columns; spine-adjacent gaps get spineGapMul. */
  rankGap: 248,
  spineGapMul: 1.28,
  /** Ranks pipelines (e.g. GSTF) pack denser so the fitted overview stays readable. */
  ranksGapMul: 0.58,
  laneGap: 56,
  /** Vertical air in core / ranks stacks. */
  stackGap: 52,
  /** Satellite stacks (inputs / outputs) — still tighter than core, with real air. */
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

/** Dive-mode camera tunables — soft framing, not flowchart zoom chaos. */
export const JOURNEY = {
  /** Base viewport-heights of pin scroll; scaled by tour length. */
  pinVhBase: 0.72,
  pinVhPerHop: 0.38,
  pinVhMin: 1.15,
  /** Room for 5–7 spine stops without a punishing scroll. */
  pinVhMax: 3.1,
  /** Soft catch-up so scrub doesn’t feel locked to the wheel. */
  scrub: 0.9,
  /** Align under site chrome; hero exit + void hand off into this pin. */
  pinStart: "top top+=56",
  /** Timeline duration units per stop beat (hold + optional travel after). */
  beatDur: 1,
  /**
   * Dive frames a readable card-sized stop (~38% viewport width),
   * not a full-bleed flowchart blow-up.
   */
  focusNodeFrac: 0.38,
  focusScaleMin: 1.15,
  focusScaleMax: 2.6,
  /** Opening dive: wider empty peek → first stop (share of one beatDur). */
  diveFrac: 0.36,
  diveFromScaleMul: 0.42,
  /** Within a beat after the first: hold readable pose, then travel to next. */
  holdFrac: 0.52,
  travelFrac: 0.48,
  /**
   * Cluster framing: fit siblings if possible, but never below clusterScaleMinMul
   * of a single-node focus (siblings may clip — focus must stay readable).
   */
  clusterFrac: 0.88,
  clusterScaleMinMul: 0.72,
  clusterScaleMaxMul: 0.95,
  widePad: 56,
  /** Fan mid beat: brief pull-back so fan-in/out reads as a scene, not a hop. */
  fanMidPad: 52,
  fanMidFrac: 1.05,
  /** Dim non-focused hard so one node owns the screen. */
  nodeDim: 0.04,
  nodeNear: 0.38,
  nodeFull: 1,
  edgeDim: 0.02,
  edgeNear: 0.28,
  edgeFull: 0.85,
  /**
   * Snap onto hold midpoints (not hold ends) so travel doesn’t immediately
   * fight the snap spring when scrub overshoots by a hair.
   */
  snapDurationMin: 0.18,
  snapDurationMax: 0.42,
  snapDelay: 0.08,
} as const;

export type CameraPose = {
  x: number;
  y: number;
  scale: number;
};

export type ViewportSize = { width: number; height: number };

export type JourneyStopKind = "node" | "edge" | "cluster" | "overview";

export type JourneyStop = {
  index: number;
  /** Tour id (node, edge, or synthetic overview). */
  id: string;
  kind: JourneyStopKind;
  /** Primary node for class spotlight (hub or representative). */
  focusNodeId: string;
  /** All nodes that should read as “here” (cluster siblings or single). */
  spotlightIds: string[];
  /** Solid edges to light for this story beat. */
  edgeIds: string[];
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
  /** Solid edges among fan nodes (drawn during the fan beat). */
  fanEdgeIds: string[];
  fromPose: CameraPose;
  /**
   * Brief wide pose mid-travel for fan-in/out (zoom out → zoom in).
   * Linear hops leave this undefined.
   */
  midPose?: CameraPose;
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
  /** Presentation mode — overview-story keeps camera fitted. */
  mode: "camera" | "overview-story";
};

/** Softer dim for caption-led storytelling over a fitted map. */
export const OVERVIEW_STORY = {
  /** World padding around nodes/groups/edge routes when fitting. */
  overviewPad: 64,
  /** Fraction of viewport the fitted bounds may fill (leave chrome air). */
  overviewFrac: 0.92,
  /** Cap so tiny graphs don’t blow up; never used as a zoom-in floor. */
  scaleCeil: 1.45,
  /** Whole-map entrance opacity (readable, not ghost). */
  overviewNode: 0.9,
  overviewEdge: 0.42,
  /** Story beat dim — rest of map stays legible. */
  nodeDim: 0.32,
  nodeNear: 0.78,
  nodeFull: 1,
  edgeDim: 0.16,
  edgeFull: 0.95,
} as const;

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
  nodeWidth: number = node.width ?? JOURNEY_LAYOUT.nodeWidth,
  nodeHeight: number = node.height ?? JOURNEY_LAYOUT.nodeHeight,
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

export function focusScaleForViewport(
  viewport: ViewportSize,
  nodeWidth: number = JOURNEY_LAYOUT.nodeWidth,
): number {
  const raw = (viewport.width * JOURNEY.focusNodeFrac) / nodeWidth;
  return Math.min(JOURNEY.focusScaleMax, Math.max(JOURNEY.focusScaleMin, raw));
}

function boundsOfNodes(
  nodes: GraphLayoutNode[],
  pad: number,
): { cx: number; cy: number; width: number; height: number } {
  const minX = Math.min(...nodes.map((n) => n.x)) - pad;
  const minY = Math.min(...nodes.map((n) => n.y)) - pad;
  const maxX =
    Math.max(
      ...nodes.map((n) => n.x + (n.width ?? JOURNEY_LAYOUT.nodeWidth)),
    ) + pad;
  const maxY =
    Math.max(
      ...nodes.map((n) => n.y + (n.height ?? JOURNEY_LAYOUT.nodeHeight)),
    ) + pad;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/** World bounds for overview fit — nodes, group chrome, and edge routes. */
export function boundsOfLayout(
  layout: GraphLayoutResult,
  pad: number,
): { cx: number; cy: number; width: number; height: number } {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const n of layout.nodes) {
    xs.push(n.x, n.x + n.width);
    ys.push(n.y, n.y + n.height);
  }
  for (const g of layout.groups) {
    xs.push(g.x, g.x + g.width);
    ys.push(g.y, g.y + g.height);
  }
  for (const e of layout.edges) {
    for (const p of e.points) {
      xs.push(p.x);
      ys.push(p.y);
    }
  }

  if (xs.length === 0) {
    return {
      cx: layout.width / 2,
      cy: layout.height / 2,
      width: Math.max(1, layout.width),
      height: Math.max(1, layout.height),
    };
  }

  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * True fit for overview: scale to show the whole map.
 * No cluster min-floor (that was cropping the overview).
 */
export function fitOverviewPose(
  layout: GraphLayoutResult,
  viewport: ViewportSize,
  pad: number = OVERVIEW_STORY.overviewPad,
  fillFrac: number = OVERVIEW_STORY.overviewFrac,
): CameraPose {
  const b = boundsOfLayout(layout, pad);
  const sx = (viewport.width * fillFrac) / b.width;
  const sy = (viewport.height * fillFrac) / b.height;
  const scale = Math.min(sx, sy, OVERVIEW_STORY.scaleCeil);
  return poseForPoint(b.cx, b.cy, scale, viewport);
}

/**
 * Dive / fan framing: keep a readable tablet-sized zoom.
 * Not for whole-map overview — use fitOverviewPose there.
 */
export function widePoseForNodes(
  nodes: GraphLayoutNode[],
  viewport: ViewportSize,
  pad: number = JOURNEY.widePad,
  fillFrac: number = JOURNEY.clusterFrac,
  /** Prefer weighting the frame toward this node so the hub still dominates. */
  biasNode?: GraphLayoutNode,
): CameraPose {
  const b = boundsOfNodes(nodes, pad);
  const focus = focusScaleForViewport(viewport);
  const sx = (viewport.width * fillFrac) / b.width;
  const sy = (viewport.height * fillFrac) / b.height;
  const fitted = Math.min(sx, sy, focus * JOURNEY.clusterScaleMaxMul);
  // Floor: cluster stops were reading ~1.5× (flat map). Keep focus tablet-sized.
  const scale = Math.max(focus * JOURNEY.clusterScaleMinMul, fitted);
  let cx = b.cx;
  let cy = b.cy;
  if (biasNode) {
    const c = nodeCenter(biasNode);
    cx = b.cx * 0.4 + c.x * 0.6;
    cy = b.cy * 0.4 + c.y * 0.6;
  }
  return poseForPoint(cx, cy, scale, viewport);
}

export function poseForNode(
  node: GraphLayoutNode,
  viewport: ViewportSize,
  scale = focusScaleForViewport(
    viewport,
    node.width ?? JOURNEY_LAYOUT.nodeWidth,
  ),
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
 * Default page plan: fitted overview + path-story stops.
 * Pass `journeyMode: "camera"` only if a caller still needs scrub poses as primary.
 */
export function planArchitectureJourney(
  graph: ArchitectureGraph,
  viewport: ViewportSize,
): JourneyPlan {
  if (graph.journeyMode === "camera") {
    return planCameraJourney(graph, viewport);
  }
  return planOverviewStoryJourney(graph, viewport);
}

/** On-demand dive: per-stop camera poses from the same tour. */
export function planDiveJourney(
  graph: ArchitectureGraph,
  viewport: ViewportSize,
): JourneyPlan {
  return planCameraJourney(graph, viewport);
}

function edgesAmongNodes(
  nodeIds: string[],
  degrees: DegreeMaps,
): string[] {
  if (nodeIds.length < 2) return [];
  const set = new Set(nodeIds);
  const out: string[] = [];
  for (const [ends, eid] of degrees.edgeByEnds) {
    const [a, b] = ends.split("->");
    if (set.has(a) && set.has(b)) out.push(eid);
  }
  return out;
}

/** Solid edges with at least one end in the set (solo-node story beats). */
function edgesTouchingNodes(
  nodeIds: string[],
  degrees: DegreeMaps,
): string[] {
  if (nodeIds.length === 0) return [];
  const set = new Set(nodeIds);
  const out: string[] = [];
  for (const [ends, eid] of degrees.edgeByEnds) {
    const [a, b] = ends.split("->");
    if (set.has(a) || set.has(b)) out.push(eid);
  }
  return out;
}

/**
 * Overview-first storytelling: one fitted pose; path beats are caption + highlight.
 * Tour length should stay in the 3–5 teaching range for the path story UI.
 */
export function planOverviewStoryJourney(
  graph: ArchitectureGraph,
  viewport: ViewportSize,
): JourneyPlan {
  const layout = layoutForJourney(graph);
  const degrees = buildDegreeMaps(graph, layout);
  const captionsById = captionMap(graph);
  const overviewPose = fitOverviewPose(layout, viewport);

  const overviewTitle = graph.title
    ? `How ${graph.title} works`
    : "How it works";

  const stops: JourneyStop[] = [];
  const captions: JourneyCaption[] = [];

  graph.tour.forEach((id, i) => {
    const resolved = resolveStop(id, degrees, graph);
    const authored = captionsById.get(id);
    const explicit = authored?.spotlightIds?.filter((sid) =>
      degrees.nodeById.has(sid),
    );
    const cluster = clusterNodesForStop(
      resolved.focusNodeId,
      graph,
      degrees,
      authored,
    );

    let spotlightIds: string[];
    let kind: JourneyStopKind;

    if (explicit && explicit.length >= 1) {
      spotlightIds = explicit;
      kind =
        explicit.length >= 2 || (authored?.items && authored.items.length >= 2)
          ? "cluster"
          : "node";
    } else if (cluster.length >= 2) {
      spotlightIds = cluster.map((n) => n.id);
      kind = "cluster";
    } else {
      spotlightIds = [resolved.focusNodeId];
      kind = resolved.kind === "edge" ? "edge" : "node";
    }

    const edgeIds =
      spotlightIds.length === 1
        ? edgesTouchingNodes(spotlightIds, degrees)
        : edgesAmongNodes(spotlightIds, degrees);

    stops.push({
      index: i,
      id,
      kind,
      focusNodeId: resolved.focusNodeId,
      spotlightIds,
      edgeIds,
      pose: overviewPose,
      label: authored?.title ?? resolved.label,
    });

    captions.push({
      id,
      title: authored?.title ?? resolved.label,
      body: authored?.body ?? "Next stage in the path.",
      items: authored?.items,
      kind,
    });
  });

  const n = Math.max(stops.length, 1);
  const duration = n;
  const snapProgress = stops.map((_, i) => Math.min(1, (i + 0.5) / n));

  return {
    layout,
    stops,
    hops: [],
    startPose: overviewPose,
    diveFromPose: {
      ...overviewPose,
      scale: overviewPose.scale * 0.92,
    },
    startNodeId: layout.nodes[0]?.id ?? "",
    startLabel: overviewTitle,
    pinVh: 0,
    duration,
    snapProgress,
    captions,
    mode: "overview-story",
  };
}

function planCameraJourney(
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
        ? widePoseForNodes(cluster, viewport, JOURNEY.widePad, JOURNEY.clusterFrac, focusNode)
        : focusNode
          ? poseForNode(focusNode, viewport, focusScale)
          : { x: 0, y: 0, scale: 1 };

    const kind: JourneyStopKind = isCluster
      ? "cluster"
      : resolved.kind === "edge"
        ? "edge"
        : "node";

    const spotlightIds = isCluster
      ? cluster.map((n) => n.id)
      : [resolved.focusNodeId];

    stops.push({
      index: i,
      id,
      kind,
      focusNodeId: resolved.focusNodeId,
      spotlightIds,
      edgeIds: edgesAmongNodes(spotlightIds, degrees),
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

    const fanEdgeIds: string[] = [];
    if (fanNodeIds.length >= 2) {
      const fanSet = new Set(fanNodeIds);
      for (const [ends, eid] of degrees.edgeByEnds) {
        const [a, b] = ends.split("->");
        if (fanSet.has(a) && fanSet.has(b)) fanEdgeIds.push(eid);
      }
    }

    let midPose: CameraPose | undefined;
    const alreadyWide =
      fromStop.kind === "cluster" || toStop.kind === "cluster";
    if ((fanOut || fanIn) && fanNodeIds.length >= 2 && !alreadyWide) {
      const fanLaid = fanNodeIds
        .map((id) => degrees.nodeById.get(id))
        .filter((n): n is GraphLayoutNode => Boolean(n));
      if (fanLaid.length >= 2) {
        midPose = widePoseForNodes(
          fanLaid,
          viewport,
          JOURNEY.fanMidPad,
          JOURNEY.fanMidFrac,
          toNode,
        );
      }
    } else if (
      (fanOut || fanIn) &&
      fanNodeIds.length >= 2 &&
      alreadyWide &&
      fromStop.kind !== "cluster"
    ) {
      const fanLaid = fanNodeIds
        .map((id) => degrees.nodeById.get(id))
        .filter((n): n is GraphLayoutNode => Boolean(n));
      if (fanLaid.length >= 2) {
        const peek = widePoseForNodes(
          fanLaid,
          viewport,
          JOURNEY.fanMidPad,
          JOURNEY.fanMidFrac,
          fromNode,
        );
        if (peek.scale < toStop.pose.scale * 0.92) {
          midPose = peek;
        }
      }
    }

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
      fanEdgeIds,
      fromPose: fromStop.pose,
      midPose,
      toPose: toStop.pose,
      label: toStop.label,
    });
  }

  const beat = JOURNEY.beatDur;
  const diveDur = beat * JOURNEY.diveFrac;
  const holdDur = beat * JOURNEY.holdFrac;
  const travelDur = beat * JOURNEY.travelFrac;
  const n = Math.max(stops.length, 1);
  const settleDur = 0.08;
  const duration =
    diveDur + holdDur + Math.max(0, n - 1) * (travelDur + holdDur) + settleDur;

  const snapProgress: number[] = [];
  for (let i = 0; i < n; i++) {
    const holdStart = diveDur + i * (travelDur + holdDur);
    const holdMid = holdStart + holdDur * 0.5;
    snapProgress.push(Math.min(1, holdMid / duration));
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
    mode: "camera",
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

/**
 * Active edge ids for the current scrub segment (primary + path edges on multi-hop).
 * Aligned with stopIndexForProgress: outbound edges while leaving a stop, arrival
 * edges once focus commits to the destination (incl. exact snap rest).
 */
export function activeEdgesForProgress(
  progress: number,
  snapProgress: number[],
  hops: JourneyHop[],
): string[] {
  if (snapProgress.length === 0 || progress <= snapProgress[0]) return [];

  const idx = stopIndexForProgress(progress, snapProgress);

  if (idx < snapProgress.length - 1) {
    const mid = (snapProgress[idx] + snapProgress[idx + 1]) / 2;
    if (progress > snapProgress[idx] && progress < mid) {
      return hopEdgeIds(hops.find((h) => h.toIndex === idx + 1));
    }
  }

  if (idx > 0) {
    return hopEdgeIds(hops.find((h) => h.toIndex === idx));
  }
  return [];
}

function hopEdgeIds(hop: JourneyHop | undefined): string[] {
  if (!hop) return [];
  if (hop.edgeIds.length > 0) return hop.edgeIds;
  return hop.edgeId ? [hop.edgeId] : [];
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
