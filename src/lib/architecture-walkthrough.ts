import type { ArchitectureGraph } from "@/lib/architecture-graph";

export type WalkthroughStep = {
  id: string;
  title: string;
  body: string;
  items?: string[];
  targetKind?: "node" | "edge" | "cluster";
  /** Node ids to highlight when this beat is selected. */
  spotlightIds?: string[];
};

function shortTitle(label: string): string {
  const first = label.split(/[—|]/)[0]?.trim() || label;
  return first.length <= 42 ? first : `${first.slice(0, 41)}…`;
}

function positionBody(index: number, total: number): string {
  if (total <= 1) return "Stage in the system path.";
  if (index === 0) return "What enters the system.";
  if (index === total - 1) return "What comes out.";
  return "Next stage in the path.";
}

/**
 * Resolve the optional plain beat list from owned graph IR.
 *
 * Captions stay honest: authored copy wins, otherwise node/edge labels and
 * generic positional text are used. Mermaid/SVG walkthrough derivation was
 * intentionally removed with the old scroll-tour UI.
 */
export function resolveTourStepsFromGraph(graph: ArchitectureGraph): WalkthroughStep[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(
    graph.edges.filter((edge) => edge.id).map((edge) => [edge.id as string, edge]),
  );
  const captionsById = new Map((graph.captions ?? []).map((caption) => [caption.id, caption]));

  return graph.tour.map((stopId, index) => {
    const caption = captionsById.get(stopId);
    const node = nodeById.get(stopId);
    const edge = edgeById.get(stopId);

    if (caption) {
      const spotlightIds =
        caption.spotlightIds && caption.spotlightIds.length > 0
          ? caption.spotlightIds
          : node
            ? [node.id]
            : edge
              ? [edge.from, edge.to]
              : [stopId];
      const isCluster =
        (caption.items?.length ?? 0) >= 2 || spotlightIds.length >= 2;
      return {
        id: stopId,
        title: shortTitle(caption.title),
        body: caption.body,
        items: caption.items,
        spotlightIds,
        targetKind: isCluster ? ("cluster" as const) : node ? ("node" as const) : ("edge" as const),
      };
    }

    if (node) {
      return {
        id: node.id,
        title: shortTitle(node.label),
        body:
          index === 0 && graph.summary
            ? graph.summary
            : positionBody(index, graph.tour.length),
        spotlightIds: [node.id],
        targetKind: "node" as const,
      };
    }

    if (edge) {
      const from = nodeById.get(edge.from)?.label ?? edge.from;
      const to = nodeById.get(edge.to)?.label ?? edge.to;
      return {
        id: edge.id ?? stopId,
        title: shortTitle(edge.label || `${from} → ${to}`),
        body: positionBody(index, graph.tour.length),
        spotlightIds: [edge.from, edge.to],
        targetKind: "edge" as const,
      };
    }

    return {
      id: stopId,
      title: shortTitle(stopId),
      body: positionBody(index, graph.tour.length),
      spotlightIds: [stopId],
      targetKind: "node" as const,
    };
  });
}
