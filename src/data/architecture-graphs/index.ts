/**
 * Portfolio-local architecture graph fixtures (rollout fallback).
 * Prefer fetched `docs/architecture.graph.json` when `graphSource === "github"`.
 *
 * @see docs/architecture-graph.md
 */

import type { ArchitectureGraph } from "@/lib/architecture-graph";
import { parseArchitectureGraph } from "@/lib/architecture-graph";

import ada from "@/data/architecture-graphs/ada.graph.json";
import backgroundStudio from "@/data/architecture-graphs/background-studio.graph.json";
import gstf from "@/data/architecture-graphs/gstf.graph.json";
import piiGateway from "@/data/architecture-graphs/pii-gateway.graph.json";
import soundVisualiser from "@/data/architecture-graphs/sound-visualiser.graph.json";

const FIXTURES: Record<string, unknown> = {
  "background-studio": backgroundStudio,
  "sound-visualiser": soundVisualiser,
  "pii-gateway": piiGateway,
  ada,
  gstf,
};

/** Validated local IR for a registry slug, if authored in this repo. */
export function getLocalArchitectureGraph(slug: string): ArchitectureGraph | undefined {
  const raw = FIXTURES[slug];
  if (!raw) return undefined;
  return parseArchitectureGraph(raw);
}

/** All local fixtures, validated. Throws if any IR is invalid. */
export function getAllLocalArchitectureGraphs(): Record<string, ArchitectureGraph> {
  const out: Record<string, ArchitectureGraph> = {};
  for (const [slug, raw] of Object.entries(FIXTURES)) {
    out[slug] = parseArchitectureGraph(raw);
  }
  return out;
}

export const ARCHITECTURE_GRAPH_SLUGS = Object.keys(FIXTURES);
