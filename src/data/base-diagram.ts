/**
 * Static generic flowchart used when no owned architecture graph exists.
 */
export function buildBaseDiagramSvg(title: string): string {
  const label = escapeXml(truncateLabel(title, 22));

  return `<svg class="project-diagram-svg project-diagram-svg--base" viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="How ${label} works">
  <style>
    .project-diagram-svg--base .dg-edge {
      fill: none;
      stroke: rgba(242, 240, 235, 0.45);
      stroke-width: 1.5;
      stroke-linecap: square;
    }
    .project-diagram-svg--base .dg-node {
      fill: #0a0a0a;
      stroke: rgba(242, 240, 235, 0.55);
      stroke-width: 1.5;
    }
    .project-diagram-svg--base .dg-node--core {
      stroke: rgba(242, 240, 235, 0.85);
    }
    .project-diagram-svg--base .dg-label {
      fill: #f2f0eb;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      text-anchor: middle;
    }
    .project-diagram-svg--base .dg-label--muted {
      fill: #9a9690;
      font-size: 11px;
    }
  </style>

  <!-- Flow edges -->
  <line data-diagram-edge class="dg-edge" x1="140" y1="140" x2="230" y2="140" />
  <line data-diagram-edge class="dg-edge" x1="410" y1="140" x2="500" y2="140" />
  <line data-diagram-edge class="dg-edge" x1="320" y1="92" x2="320" y2="58" />
  <line data-diagram-edge class="dg-edge" x1="320" y1="188" x2="320" y2="222" />

  <!-- Input -->
  <g data-diagram-node>
    <rect class="dg-node" x="40" y="110" width="100" height="60" />
    <text class="dg-label" x="90" y="145">Input</text>
  </g>

  <!-- Core (project title) -->
  <g data-diagram-node>
    <rect class="dg-node dg-node--core" x="230" y="100" width="180" height="80" />
    <text class="dg-label" x="320" y="138">${label}</text>
    <text class="dg-label dg-label--muted" x="320" y="158">core system</text>
  </g>

  <!-- Output -->
  <g data-diagram-node>
    <rect class="dg-node" x="500" y="110" width="100" height="60" />
    <text class="dg-label" x="550" y="145">Output</text>
  </g>

  <!-- Config -->
  <g data-diagram-node>
    <rect class="dg-node" x="255" y="20" width="130" height="38" />
    <text class="dg-label dg-label--muted" x="320" y="44">Config</text>
  </g>

  <!-- Storage -->
  <g data-diagram-node>
    <rect class="dg-node" x="255" y="222" width="130" height="38" />
    <text class="dg-label dg-label--muted" x="320" y="246">Storage</text>
  </g>
</svg>`;
}

function truncateLabel(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
