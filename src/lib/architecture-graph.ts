/**
 * Owned architecture graph IR for portfolio “How it works” maps.
 * Mermaid (`.mmd`) stays canonical on GitHub; the site prefers this IR.
 *
 * @see docs/architecture-graph.md
 */

export const ARCHITECTURE_GRAPH_VERSION = 1 as const;

export type GraphNodeKind =
  | "input"
  | "process"
  | "decision"
  | "store"
  | "output"
  | "other";

export type GraphNodeShape =
  | "rect"
  | "rounded"
  | "diamond"
  | "cylinder"
  | "stadium"
  | "ticket";

export type GraphEdgeStyle = "solid" | "dashed";

/** Subtle per-project visual tokens (same components; accent / density only). */
export type ArchitectureGraphSkin =
  | "studio"
  | "sound"
  | "pii"
  | "ada"
  | "gstf"
  | "default";

/** Composition weight for overview chrome (larger / quieter). */
export type ArchitectureNodeWeight = "spine" | "normal" | "satellite";

/**
 * Optional layout hints — prefer algorithmic composition; nudge focal nodes.
 * `dx`/`dy` are portable; absolute `x`/`y` are last-resort hand placement.
 */
export type ArchitectureNodeLayoutHint = {
  dx?: number;
  dy?: number;
  x?: number;
  y?: number;
  /** Scale multiplier vs role default (clamped ~0.7–1.4). */
  scale?: number;
  weight?: ArchitectureNodeWeight;
};

export type ArchitectureGraphNode = {
  id: string;
  label: string;
  kind?: GraphNodeKind;
  groupId?: string;
  shape?: GraphNodeShape;
  /** Optional composition overrides (nudge / scale / weight). */
  layout?: ArchitectureNodeLayoutHint;
};

export type ArchitectureGraphEdge = {
  /** Stable id; required when referenced from `tour`. */
  id?: string;
  from: string;
  to: string;
  label?: string;
  style?: GraphEdgeStyle;
};

export type ArchitectureGraphGroup = {
  id: string;
  label: string;
};

/** Optional ordered caption beats. Each entry references a graph node or edge. */
export type ArchitectureGraphTourStop = string;

/**
 * Visitor caption for one `tour` stop.
 * Prefer authoring these in repository graph docs. Use `items` when a beat
 * summarizes several related containers.
 */
export type ArchitectureTourCaption = {
  /** Must match a `tour[]` entry (node or edge id). */
  id: string;
  /** Short void-friendly title (may rename a representative node to a cluster label). */
  title: string;
  /** One plain-English sentence — what this stop is. */
  body: string;
  /** Optional child pieces when the stop stands for a set (e.g. three inputs). */
  items?: string[];
  /** Reserved for a future optional overview highlight. */
  spotlightIds?: string[];
};

export type ArchitectureGraph = {
  version: typeof ARCHITECTURE_GRAPH_VERSION;
  /** Optional display title (defaults to project title at render time). */
  title?: string;
  /** One–two sentences: primary happy path for visitors. */
  summary?: string;
  /**
   * Honest note when the portfolio map simplifies the GitHub Mermaid
   * (collapsed internals, omitted alternate paths, etc.).
   */
  notes?: string;
  /**
   * Optional skin id for accent / density tokens.
   * When omitted, portfolio resolves from project slug.
   */
  skin?: ArchitectureGraphSkin;
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
  groups?: ArchitectureGraphGroup[];
  /** Required for portfolio consumption. */
  tour: ArchitectureGraphTourStop[];
  /**
   * Optional per-stop captions (title / body / items).
   * When present, every `tour` id should have a matching caption.
   */
  captions?: ArchitectureTourCaption[];
};

export type ArchitectureGraphValidationIssue = {
  path: string;
  message: string;
};

export type ArchitectureGraphValidationResult =
  | { ok: true; graph: ArchitectureGraph; warnings: ArchitectureGraphValidationIssue[] }
  | { ok: false; issues: ArchitectureGraphValidationIssue[] };

const NODE_KINDS: GraphNodeKind[] = [
  "input",
  "process",
  "decision",
  "store",
  "output",
  "other",
];

const NODE_SHAPES: GraphNodeShape[] = [
  "rect",
  "rounded",
  "diamond",
  "cylinder",
  "stadium",
  "ticket",
];

const EDGE_STYLES: GraphEdgeStyle[] = ["solid", "dashed"];

const GRAPH_SKINS: ArchitectureGraphSkin[] = [
  "studio",
  "sound",
  "pii",
  "ada",
  "gstf",
  "default",
];

const SLUG_SKINS: Record<string, ArchitectureGraphSkin> = {
  "background-studio": "studio",
  "sound-visualiser": "sound",
  "pii-gateway": "pii",
  ada: "ada",
  gstf: "gstf",
};

/** Resolve skin from authored IR, else known slug, else default. */
export function resolveArchitectureSkin(
  graph: Pick<ArchitectureGraph, "skin">,
  slug?: string,
): ArchitectureGraphSkin {
  // Treat explicit "default" as unset so slug accents still apply.
  if (graph.skin && graph.skin !== "default" && GRAPH_SKINS.includes(graph.skin)) {
    return graph.skin;
  }
  if (slug && SLUG_SKINS[slug]) return SLUG_SKINS[slug];
  return "default";
}

/**
 * Default render shape from kind when `shape` is omitted.
 * input→chip, process→tablet, store→cylinder, decision→diamond, output→ticket.
 */
export function defaultShapeForKind(kind?: GraphNodeKind): GraphNodeShape {
  switch (kind) {
    case "input":
      return "stadium";
    case "process":
      return "rounded";
    case "store":
      return "cylinder";
    case "decision":
      return "diamond";
    case "output":
      return "ticket";
    default:
      return "rounded";
  }
}

const TOUR_MIN = 3;
const TOUR_MAX = 8;
/** Prefer ≤12 visible nodes; warn (do not fail) above this. */
const NODE_BUDGET_SOFT = 12;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate an architecture graph IR instance.
 * Checks shape, referential integrity, non-empty labels, and tour bounds.
 */
export function validateArchitectureGraph(
  data: unknown,
): ArchitectureGraphValidationResult {
  const issues: ArchitectureGraphValidationIssue[] = [];

  if (!isPlainObject(data)) {
    return { ok: false, issues: [{ path: "", message: "Expected a JSON object at root" }] };
  }

  if (data.version !== ARCHITECTURE_GRAPH_VERSION) {
    issues.push({
      path: "version",
      message: `version must be ${ARCHITECTURE_GRAPH_VERSION}`,
    });
  }

  if (data.title !== undefined && !isNonEmptyString(data.title)) {
    issues.push({ path: "title", message: "title must be a non-empty string when provided" });
  }

  if (data.summary !== undefined && !isNonEmptyString(data.summary)) {
    issues.push({
      path: "summary",
      message: "summary must be a non-empty string when provided",
    });
  }

  if (data.notes !== undefined && !isNonEmptyString(data.notes)) {
    issues.push({ path: "notes", message: "notes must be a non-empty string when provided" });
  }

  if (data.skin !== undefined) {
    if (
      !isNonEmptyString(data.skin) ||
      !GRAPH_SKINS.includes(data.skin as ArchitectureGraphSkin)
    ) {
      issues.push({
        path: "skin",
        message: `skin must be one of: ${GRAPH_SKINS.join(", ")}`,
      });
    }
  }

  if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
    issues.push({ path: "nodes", message: "nodes must be a non-empty array" });
  }

  if (!Array.isArray(data.edges)) {
    issues.push({ path: "edges", message: "edges must be an array" });
  }

  if (!Array.isArray(data.tour)) {
    issues.push({ path: "tour", message: "tour must be an array of node or edge ids" });
  }

  if (data.groups !== undefined && !Array.isArray(data.groups)) {
    issues.push({ path: "groups", message: "groups must be an array when provided" });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const groupIds = new Set<string>();
  const groups: ArchitectureGraphGroup[] = [];

  if (Array.isArray(data.groups)) {
    data.groups.forEach((raw, i) => {
      if (!isPlainObject(raw)) {
        issues.push({ path: `groups[${i}]`, message: "group must be an object" });
        return;
      }
      if (!isNonEmptyString(raw.id)) {
        issues.push({ path: `groups[${i}].id`, message: "group id is required" });
        return;
      }
      if (!isNonEmptyString(raw.label)) {
        issues.push({ path: `groups[${i}].label`, message: "group label is required" });
        return;
      }
      const id = raw.id.trim();
      if (groupIds.has(id)) {
        issues.push({ path: `groups[${i}].id`, message: `duplicate group id "${id}"` });
        return;
      }
      groupIds.add(id);
      groups.push({ id, label: raw.label.trim() });
    });
  }

  const nodeIds = new Set<string>();
  const nodes: ArchitectureGraphNode[] = [];

  (data.nodes as unknown[]).forEach((raw, i) => {
    if (!isPlainObject(raw)) {
      issues.push({ path: `nodes[${i}]`, message: "node must be an object" });
      return;
    }
    if (!isNonEmptyString(raw.id)) {
      issues.push({ path: `nodes[${i}].id`, message: "node id is required" });
      return;
    }
    if (!isNonEmptyString(raw.label)) {
      issues.push({ path: `nodes[${i}].label`, message: "node label is required" });
      return;
    }
    const id = raw.id.trim();
    if (nodeIds.has(id)) {
      issues.push({ path: `nodes[${i}].id`, message: `duplicate node id "${id}"` });
      return;
    }
    if (groupIds.has(id)) {
      issues.push({
        path: `nodes[${i}].id`,
        message: `node id "${id}" collides with a group id`,
      });
    }
    nodeIds.add(id);

    const node: ArchitectureGraphNode = { id, label: raw.label.trim() };

    if (raw.kind !== undefined) {
      if (!isNonEmptyString(raw.kind) || !NODE_KINDS.includes(raw.kind as GraphNodeKind)) {
        issues.push({
          path: `nodes[${i}].kind`,
          message: `kind must be one of: ${NODE_KINDS.join(", ")}`,
        });
      } else {
        node.kind = raw.kind as GraphNodeKind;
      }
    }

    if (raw.shape !== undefined) {
      if (!isNonEmptyString(raw.shape) || !NODE_SHAPES.includes(raw.shape as GraphNodeShape)) {
        issues.push({
          path: `nodes[${i}].shape`,
          message: `shape must be one of: ${NODE_SHAPES.join(", ")}`,
        });
      } else {
        node.shape = raw.shape as GraphNodeShape;
      }
    }

    if (raw.groupId !== undefined) {
      if (!isNonEmptyString(raw.groupId)) {
        issues.push({
          path: `nodes[${i}].groupId`,
          message: "groupId must be a non-empty string when provided",
        });
      } else if (!groupIds.has(raw.groupId.trim())) {
        issues.push({
          path: `nodes[${i}].groupId`,
          message: `unknown groupId "${raw.groupId}"`,
        });
      } else {
        node.groupId = raw.groupId.trim();
      }
    }

    if (raw.layout !== undefined) {
      if (!isPlainObject(raw.layout)) {
        issues.push({
          path: `nodes[${i}].layout`,
          message: "layout must be an object when provided",
        });
      } else {
        const hint: ArchitectureNodeLayoutHint = {};
        const layoutRaw = raw.layout;
        for (const key of ["dx", "dy", "x", "y", "scale"] as const) {
          const v = layoutRaw[key];
          if (v === undefined) continue;
          if (typeof v !== "number" || !Number.isFinite(v)) {
            issues.push({
              path: `nodes[${i}].layout.${key}`,
              message: `${key} must be a finite number when provided`,
            });
          } else {
            hint[key] = v;
          }
        }
        if (layoutRaw.weight !== undefined) {
          const w = layoutRaw.weight;
          if (w !== "spine" && w !== "normal" && w !== "satellite") {
            issues.push({
              path: `nodes[${i}].layout.weight`,
              message: 'weight must be "spine", "normal", or "satellite"',
            });
          } else {
            hint.weight = w;
          }
        }
        if (Object.keys(hint).length > 0) node.layout = hint;
      }
    }

    nodes.push(node);
  });

  const edgeIds = new Set<string>();
  const edges: ArchitectureGraphEdge[] = [];

  (data.edges as unknown[]).forEach((raw, i) => {
    if (!isPlainObject(raw)) {
      issues.push({ path: `edges[${i}]`, message: "edge must be an object" });
      return;
    }
    if (!isNonEmptyString(raw.from)) {
      issues.push({ path: `edges[${i}].from`, message: "edge from is required" });
      return;
    }
    if (!isNonEmptyString(raw.to)) {
      issues.push({ path: `edges[${i}].to`, message: "edge to is required" });
      return;
    }

    const from = raw.from.trim();
    const to = raw.to.trim();

    if (!nodeIds.has(from)) {
      issues.push({ path: `edges[${i}].from`, message: `unknown node "${from}"` });
    }
    if (!nodeIds.has(to)) {
      issues.push({ path: `edges[${i}].to`, message: `unknown node "${to}"` });
    }

    const edge: ArchitectureGraphEdge = { from, to };

    if (raw.id !== undefined) {
      if (!isNonEmptyString(raw.id)) {
        issues.push({
          path: `edges[${i}].id`,
          message: "edge id must be a non-empty string when provided",
        });
      } else {
        const id = raw.id.trim();
        if (edgeIds.has(id) || nodeIds.has(id) || groupIds.has(id)) {
          issues.push({
            path: `edges[${i}].id`,
            message: `duplicate or colliding edge id "${id}"`,
          });
        } else {
          edgeIds.add(id);
          edge.id = id;
        }
      }
    }

    if (raw.label !== undefined) {
      if (!isNonEmptyString(raw.label)) {
        issues.push({
          path: `edges[${i}].label`,
          message: "edge label must be a non-empty string when provided",
        });
      } else {
        edge.label = raw.label.trim();
      }
    }

    if (raw.style !== undefined) {
      if (!isNonEmptyString(raw.style) || !EDGE_STYLES.includes(raw.style as GraphEdgeStyle)) {
        issues.push({
          path: `edges[${i}].style`,
          message: `style must be one of: ${EDGE_STYLES.join(", ")}`,
        });
      } else {
        edge.style = raw.style as GraphEdgeStyle;
      }
    }

    edges.push(edge);
  });

  const tourRaw = data.tour as unknown[];
  if (tourRaw.length < TOUR_MIN || tourRaw.length > TOUR_MAX) {
    issues.push({
      path: "tour",
      message: `tour must have ${TOUR_MIN}–${TOUR_MAX} stops (got ${tourRaw.length})`,
    });
  }

  const tour: string[] = [];
  const tourSeen = new Set<string>();

  tourRaw.forEach((raw, i) => {
    if (!isNonEmptyString(raw)) {
      issues.push({ path: `tour[${i}]`, message: "tour stop must be a non-empty string id" });
      return;
    }
    const id = raw.trim();
    if (!nodeIds.has(id) && !edgeIds.has(id)) {
      issues.push({
        path: `tour[${i}]`,
        message: `tour stop "${id}" is not a node or edge id`,
      });
      return;
    }
    if (tourSeen.has(id)) {
      issues.push({ path: `tour[${i}]`, message: `duplicate tour stop "${id}"` });
      return;
    }
    tourSeen.add(id);
    tour.push(id);
  });

  const captions: ArchitectureTourCaption[] = [];
  const captionIds = new Set<string>();

  if (data.captions !== undefined) {
    if (!Array.isArray(data.captions)) {
      issues.push({ path: "captions", message: "captions must be an array when provided" });
    } else {
      data.captions.forEach((raw, i) => {
        if (!isPlainObject(raw)) {
          issues.push({ path: `captions[${i}]`, message: "caption must be an object" });
          return;
        }
        if (!isNonEmptyString(raw.id)) {
          issues.push({ path: `captions[${i}].id`, message: "caption id is required" });
          return;
        }
        if (!isNonEmptyString(raw.title)) {
          issues.push({ path: `captions[${i}].title`, message: "caption title is required" });
          return;
        }
        if (!isNonEmptyString(raw.body)) {
          issues.push({ path: `captions[${i}].body`, message: "caption body is required" });
          return;
        }

        const id = raw.id.trim();
        if (captionIds.has(id)) {
          issues.push({
            path: `captions[${i}].id`,
            message: `duplicate caption id "${id}"`,
          });
          return;
        }
        if (!tourSeen.has(id)) {
          issues.push({
            path: `captions[${i}].id`,
            message: `caption id "${id}" is not in tour`,
          });
          return;
        }

        const caption: ArchitectureTourCaption = {
          id,
          title: raw.title.trim(),
          body: raw.body.trim(),
        };

        if (raw.items !== undefined) {
          if (!Array.isArray(raw.items) || raw.items.length === 0) {
            issues.push({
              path: `captions[${i}].items`,
              message: "items must be a non-empty string array when provided",
            });
          } else {
            const items: string[] = [];
            let itemsOk = true;
            raw.items.forEach((item, j) => {
              if (!isNonEmptyString(item)) {
                itemsOk = false;
                issues.push({
                  path: `captions[${i}].items[${j}]`,
                  message: "item must be a non-empty string",
                });
                return;
              }
              items.push(item.trim());
            });
            if (itemsOk) caption.items = items;
          }
        }

        if (raw.spotlightIds !== undefined) {
          if (!Array.isArray(raw.spotlightIds) || raw.spotlightIds.length === 0) {
            issues.push({
              path: `captions[${i}].spotlightIds`,
              message: "spotlightIds must be a non-empty string array when provided",
            });
          } else {
            const spotlightIds: string[] = [];
            let spotOk = true;
            raw.spotlightIds.forEach((sid, j) => {
              if (!isNonEmptyString(sid)) {
                spotOk = false;
                issues.push({
                  path: `captions[${i}].spotlightIds[${j}]`,
                  message: "spotlight id must be a non-empty string",
                });
                return;
              }
              const trimmed = sid.trim();
              if (!nodeIds.has(trimmed)) {
                spotOk = false;
                issues.push({
                  path: `captions[${i}].spotlightIds[${j}]`,
                  message: `unknown node "${trimmed}"`,
                });
                return;
              }
              spotlightIds.push(trimmed);
            });
            if (spotOk) caption.spotlightIds = spotlightIds;
          }
        }

        captionIds.add(id);
        captions.push(caption);
      });
    }
  }

  const warnings: ArchitectureGraphValidationIssue[] = [];
  if (nodes.length > NODE_BUDGET_SOFT) {
    warnings.push({
      path: "nodes",
      message: `soft budget exceeded: ${nodes.length} nodes (aim ≤${NODE_BUDGET_SOFT} for portfolio; collapse internals)`,
    });
  }

  for (const stopId of tour) {
    if (captions.length > 0 && !captionIds.has(stopId)) {
      warnings.push({
        path: "captions",
        message: `tour stop "${stopId}" has no caption (title + body recommended)`,
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const graph: ArchitectureGraph = {
    version: ARCHITECTURE_GRAPH_VERSION,
    nodes,
    edges,
    tour,
  };

  if (isNonEmptyString(data.title)) graph.title = data.title.trim();
  if (isNonEmptyString(data.summary)) graph.summary = data.summary.trim();
  if (isNonEmptyString(data.notes)) graph.notes = data.notes.trim();
  if (
    isNonEmptyString(data.skin) &&
    GRAPH_SKINS.includes(data.skin as ArchitectureGraphSkin)
  ) {
    graph.skin = data.skin as ArchitectureGraphSkin;
  }
  if (groups.length > 0) graph.groups = groups;
  if (captions.length > 0) graph.captions = captions;

  return { ok: true, graph, warnings };
}

/** Convenience: throw with a readable message if invalid. */
export function parseArchitectureGraph(data: unknown): ArchitectureGraph {
  const result = validateArchitectureGraph(data);
  if (!result.ok) {
    const detail = result.issues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`Invalid architecture graph: ${detail}`);
  }
  return result.graph;
}
