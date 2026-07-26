/**
 * Architecture chapter walkthrough steps.
 * Prefer authored yaml → Mermaid structure → SVG labels → generic 3-step path.
 * Captions stay honest: node/subgraph labels or clearly generic copy.
 */

export type WalkthroughStep = {
  id: string;
  title: string;
  body: string;
  /** Label / node id used to spotlight in the rendered SVG */
  highlight?: string;
};

export const GENERIC_PATH_STEPS: WalkthroughStep[] = [
  {
    id: "input",
    title: "Input",
    body: "What enters the system.",
    highlight: "Input",
  },
  {
    id: "process",
    title: "Process",
    body: "What happens along the path.",
    highlight: "core system",
  },
  {
    id: "output",
    title: "Output",
    body: "What comes out.",
    highlight: "Output",
  },
];

const MIN_STEPS = 3;
const MAX_STEPS = 5;

type StageCandidate = {
  id: string;
  title: string;
  highlight: string;
  index: number;
};

function cleanLabel(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\\n/g, " ")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortTitle(label: string): string {
  const first = label.split(/[—|]/)[0]?.trim() || label;
  if (first.length <= 42) return first;
  return `${first.slice(0, 41)}…`;
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "step";
}

function positionBody(index: number, total: number): string {
  if (total <= 1) return "Stage in the system path.";
  if (index === 0) return "What enters the system.";
  if (index === total - 1) return "What comes out.";
  if (total === 3 && index === 1) return "What happens along the path.";
  return "Next stage in the path.";
}

function thinCandidates(items: StageCandidate[], min: number, max: number): StageCandidate[] {
  if (items.length === 0) return [];
  if (items.length <= max) return items;

  const count = Math.min(max, Math.max(min, max));
  const picked: StageCandidate[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (items.length - 1)) / (count - 1));
    const item = items[idx];
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }

  for (const item of items) {
    if (picked.length >= count) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }

  return picked.slice(0, max);
}

function toSteps(candidates: StageCandidate[]): WalkthroughStep[] {
  const sorted = [...candidates].sort((a, b) => a.index - b.index);
  const thinned = thinCandidates(sorted, MIN_STEPS, MAX_STEPS);
  if (thinned.length < MIN_STEPS) return [];

  return thinned.map((c, i) => ({
    id: c.id,
    title: c.title,
    body: positionBody(i, thinned.length),
    highlight: c.highlight,
  }));
}

function findSubgraphSpans(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  const startRe = /\bsubgraph\b/gi;
  let startMatch: RegExpExecArray | null;
  while ((startMatch = startRe.exec(text)) !== null) {
    const start = startMatch.index;
    const endRe = /\bend\b/gi;
    endRe.lastIndex = start + startMatch[0].length;
    const endMatch = endRe.exec(text);
    if (!endMatch) break;
    const end = endMatch.index + endMatch[0].length;
    spans.push({ start, end });
    startRe.lastIndex = end;
  }
  return spans;
}

function isInsideSpan(index: number, spans: Array<{ start: number; end: number }>): boolean {
  return spans.some((s) => index > s.start && index < s.end);
}

/**
 * Derive 3–5 steps from Mermaid flowchart source (subgraphs + top-level nodes).
 */
export function deriveStepsFromMermaid(mermaidSource: string): WalkthroughStep[] {
  const text = mermaidSource.replace(/%%[^\n]*/g, "");
  const subgraphs: StageCandidate[] = [];

  const subgraphRe =
    /subgraph\s+([A-Za-z][\w-]*)\s*(?:\[\s*"([^"]+)"\s*\]|\[\s*([^\]]+)\s*\])?/gi;
  let match: RegExpExecArray | null;
  while ((match = subgraphRe.exec(text)) !== null) {
    const rawId = match[1];
    const title = cleanLabel(match[2] || match[3] || rawId);
    subgraphs.push({
      id: slugify(rawId),
      title: shortTitle(title),
      highlight: title,
      index: match.index,
    });
  }

  if (subgraphs.length >= MIN_STEPS) {
    return toSteps(subgraphs);
  }

  const nodes: StageCandidate[] = [];
  const seen = new Set<string>(subgraphs.map((s) => s.id));
  const spans = findSubgraphSpans(text);

  const nodeRe =
    /(?:^|\n)\s*([A-Za-z][\w-]*)\s*(?:\[\s*"([^"]+)"\s*\]|\[\s*([^\]]+)\s*\]|\(\s*"([^"]+)"\s*\)|\(\s*([^)]+)\s*\)|\{\s*"([^"]+)"\s*\}|\{\s*([^}]+)\s*\}|\[\(\s*"([^"]+)"\s*\)\]|\[\(\s*([^\]]+)\s*\)\])/g;

  while ((match = nodeRe.exec(text)) !== null) {
    if (isInsideSpan(match.index, spans)) continue;

    const nodeId = match[1];
    const id = slugify(nodeId);
    if (seen.has(id)) continue;
    if (/^(flowchart|graph|subgraph|end|style|classDef|linkStyle|click)$/i.test(nodeId)) {
      continue;
    }

    const label = cleanLabel(
      match[2] ||
        match[3] ||
        match[4] ||
        match[5] ||
        match[6] ||
        match[7] ||
        match[8] ||
        match[9] ||
        nodeId,
    );
    seen.add(id);
    nodes.push({
      id,
      title: shortTitle(label),
      highlight: label,
      index: match.index,
    });
  }

  const mixed = preferSubgraphsThenNodes(subgraphs, nodes);
  const fromMixed = toSteps(mixed);
  if (fromMixed.length >= MIN_STEPS) return fromMixed;

  const fromNodes = toSteps(nodes);
  if (fromNodes.length >= MIN_STEPS) return fromNodes;

  return [];
}

/** Keep every subgraph when possible; fill remaining slots with top-level nodes. */
function preferSubgraphsThenNodes(
  subgraphs: StageCandidate[],
  nodes: StageCandidate[],
): StageCandidate[] {
  if (subgraphs.length === 0) return nodes;
  if (nodes.length === 0) return subgraphs;

  if (subgraphs.length >= MAX_STEPS) {
    return thinCandidates(subgraphs, MIN_STEPS, MAX_STEPS);
  }

  const slots = MAX_STEPS - subgraphs.length;
  const nodePicks =
    slots <= 0 ? [] : thinCandidates(nodes, Math.min(slots, nodes.length) || 1, slots);
  // If nodes < needed for overall min, take more nodes by dropping nothing from subgraphs
  const combined = [...subgraphs, ...nodePicks].sort((a, b) => a.index - b.index);
  if (combined.length >= MIN_STEPS) return combined;

  return [...subgraphs, ...nodes].sort((a, b) => a.index - b.index);
}

/**
 * Derive steps from rendered SVG node labels (base diagram or Mermaid SVG).
 */
export function deriveStepsFromSvg(root: HTMLElement): WalkthroughStep[] {
  const nodes = Array.from(
    root.querySelectorAll<SVGElement>("[data-diagram-node], .node, .cluster"),
  ).filter((el) => !el.closest("defs"));

  const candidates: StageCandidate[] = [];
  const seen = new Set<string>();

  nodes.forEach((node, index) => {
    const label = readNodeLabel(node);
    if (!label) return;
    const id = slugify(label);
    if (seen.has(id)) return;
    seen.add(id);
    candidates.push({
      id,
      title: shortTitle(label),
      highlight: label,
      index,
    });
  });

  return toSteps(candidates);
}

export function readNodeLabel(node: Element): string {
  const texts = Array.from(node.querySelectorAll("text, .nodeLabel, .label, foreignObject"));
  for (const t of texts) {
    const value = (t.textContent || "").replace(/\s+/g, " ").trim();
    if (value) return cleanLabel(value);
  }
  return cleanLabel((node.textContent || "").replace(/\s+/g, " "));
}

export function normalizeAuthoredSteps(raw: unknown): WalkthroughStep[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const steps: WalkthroughStep[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.title !== "string" || !rec.title.trim()) continue;
    const title = rec.title.trim();
    const id =
      typeof rec.id === "string" && rec.id.trim()
        ? slugify(rec.id.trim())
        : slugify(title);
    const body =
      typeof rec.body === "string" && rec.body.trim()
        ? rec.body.trim()
        : positionBody(steps.length, Math.min(MAX_STEPS, raw.length));
    const highlight =
      typeof rec.highlight === "string" && rec.highlight.trim()
        ? rec.highlight.trim()
        : typeof rec.mermaidNodeId === "string" && rec.mermaidNodeId.trim()
          ? rec.mermaidNodeId.trim()
          : title;
    steps.push({ id, title, body, highlight });
    if (steps.length >= MAX_STEPS) break;
  }

  if (steps.length < MIN_STEPS) return undefined;
  return steps;
}

export type ResolveWalkthroughInput = {
  authored?: WalkthroughStep[];
  mermaid?: string;
  svgRoot?: HTMLElement | null;
};

/**
 * Resolve 3–5 walkthrough steps with honest labels and a hard generic fallback.
 */
export function resolveWalkthroughSteps(input: ResolveWalkthroughInput): WalkthroughStep[] {
  if (input.authored && input.authored.length >= MIN_STEPS) {
    return input.authored.slice(0, MAX_STEPS).map((step, i, arr) => ({
      ...step,
      body: step.body || positionBody(i, arr.length),
    }));
  }

  if (input.mermaid) {
    const fromMermaid = deriveStepsFromMermaid(input.mermaid);
    if (fromMermaid.length >= MIN_STEPS) return fromMermaid;
  }

  if (input.svgRoot) {
    const fromSvg = deriveStepsFromSvg(input.svgRoot);
    if (fromSvg.length >= MIN_STEPS) return fromSvg;
  }

  return GENERIC_PATH_STEPS;
}

/**
 * Find SVG elements to spotlight for a step (by label / id substring).
 */
export function findHighlightElements(
  root: HTMLElement,
  step: WalkthroughStep,
): SVGElement[] {
  const needle = (step.highlight || step.title).toLowerCase();
  if (!needle) return [];

  const all = Array.from(
    root.querySelectorAll<SVGElement>("[data-diagram-node], .node, .cluster"),
  ).filter((el) => !el.closest("defs"));

  return all.filter((el) => {
    const id = (el.id || "").toLowerCase();
    const label = readNodeLabel(el).toLowerCase();
    const compactNeedle = needle.replace(/\s+/g, "");
    return (
      label === needle ||
      label.includes(needle) ||
      needle.includes(label) ||
      id.includes(needle.replace(/\s+/g, "-")) ||
      id.includes(compactNeedle)
    );
  });
}

export function pickFocusNode(
  root: HTMLElement,
  step: WalkthroughStep,
  stepIndex: number,
  stepCount: number,
): SVGElement | null {
  const matched = findHighlightElements(root, step);
  if (matched.length > 0) return matched[0];

  const all = Array.from(
    root.querySelectorAll<SVGElement>("[data-diagram-node], .node, .cluster"),
  ).filter((el) => {
    if (el.closest("defs")) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "g" || tag === "rect" || el.classList.contains("node");
  });

  if (all.length === 0) return null;
  if (stepCount <= 1) return all[0];
  const idx = Math.round((stepIndex * (all.length - 1)) / (stepCount - 1));
  return all[idx] ?? all[0];
}
