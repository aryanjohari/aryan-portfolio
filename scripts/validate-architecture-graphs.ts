#!/usr/bin/env tsx
/**
 * Validate all checked-in architecture graph fixtures + print the portfolio matrix.
 */
import { getAllLocalArchitectureGraphs } from "../src/data/architecture-graphs";
import { validateArchitectureGraph } from "../src/lib/architecture-graph";
import { summarizeGraphLayout } from "../src/lib/architecture-graph-layout";

import ada from "../src/data/architecture-graphs/ada.graph.json";
import backgroundStudio from "../src/data/architecture-graphs/background-studio.graph.json";
import gstf from "../src/data/architecture-graphs/gstf.graph.json";
import piiGateway from "../src/data/architecture-graphs/pii-gateway.graph.json";
import soundVisualiser from "../src/data/architecture-graphs/sound-visualiser.graph.json";

const RAW: Record<string, unknown> = {
  "background-studio": backgroundStudio,
  "sound-visualiser": soundVisualiser,
  "pii-gateway": piiGateway,
  ada,
  gstf,
};

let failed = false;

console.log("Validating architecture graph fixtures…\n");
console.log(
  "project              | nodes | tour | layout | warnings",
);
console.log(
  "---------------------|-------|------|--------|----------",
);

for (const [slug, raw] of Object.entries(RAW)) {
  const result = validateArchitectureGraph(raw);
  if (!result.ok) {
    failed = true;
    console.error(
      `${slug.padEnd(20)} | INVALID`,
    );
    for (const issue of result.issues) {
      console.error(`  - ${issue.path || "(root)"}: ${issue.message}`);
    }
    continue;
  }

  const summary = summarizeGraphLayout(result.graph);
  const warn =
    result.warnings.length > 0
      ? result.warnings.map((w) => w.message).join("; ")
      : "—";
  console.log(
    `${slug.padEnd(20)} | ${String(summary.nodeCount).padStart(5)} | ${String(summary.tourStops).padStart(4)} | ${summary.layoutMode.padEnd(6)} | ${warn}`,
  );
}

// Ensure loader path also parses
try {
  getAllLocalArchitectureGraphs();
} catch (err) {
  failed = true;
  console.error("\nLoader failed:", err);
}

if (failed) {
  console.error("\nArchitecture graph validation failed.");
  process.exit(1);
}

console.log("\nAll architecture graphs OK.");
