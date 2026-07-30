# Architecture graph IR (portfolio)

The portfolio uses a small owned graph IR for each project’s “How it works”
section. The current UI is deliberately thin: a fitted overview SVG followed by
an optional plain list of authored beats.

The next architecture pass will align this surface with C4:

1. show a Containers overview;
2. provide an explicit Dive entry point for Components;
3. keep navigation user-driven, without pinned scroll or camera travel.

Related: [contract.md](./contract.md), [streamline-project-docs.md](./streamline-project-docs.md).

## Files

- Schema and validation: `src/lib/architecture-graph.ts`
- Pure rank/lane layout: `src/lib/architecture-graph-layout.ts`
- SVG renderer: `src/components/ArchitectureGraphView.tsx`
- Temporary local fixtures: `src/data/architecture-graphs/<slug>.graph.json`
- Validation: `npm run validate:graphs`

Local fixtures remain temporary until repository fetches for
`docs/architecture.graph.json` are verified.

## Repository contract

Projects should keep:

- `docs/architecture.graph.json` — portfolio/C4 graph data (Containers overview)
- `docs/architecture.mmd` — optional engineer-facing Mermaid
- `docs/c4/` — optional Context / Containers / Components + `portfolio-map.json` for Dive
- `portfolio.yaml` entries for `graph` and/or `diagram`

The portfolio fetch pipeline resolves the repository graph first, then falls
back to the local fixture for the slug when GitHub has no valid graph. Mermaid
remains in the fetch contract but is not used for the primary overview.

C4 Dive uses `docs/c4/portfolio-map.json` (or inferred `3-components/*.mmd`)
plus per-container `.mmd` / `.md` pairs. Missing C4 never breaks the page.

## Minimal JSON shape

```json
{
  "version": 1,
  "title": "Optional display title",
  "summary": "One or two sentences describing the primary path.",
  "groups": [{ "id": "inputs", "label": "Inputs" }],
  "nodes": [
    {
      "id": "store",
      "label": "Scene state",
      "kind": "store",
      "groupId": "inputs",
      "shape": "cylinder"
    }
  ],
  "edges": [
    { "id": "load", "from": "input", "to": "store", "style": "solid" }
  ],
  "tour": ["input", "store"],
  "captions": [
    {
      "id": "input",
      "title": "Inputs",
      "body": "Work enters the system."
    }
  ]
}
```

Validation rules and supported node kinds/shapes live in
`src/lib/architecture-graph.ts`. Keep labels plain, references valid, and the
portfolio overview intentionally smaller than the full engineering diagram.

## Interim rendering order

1. `diagram.graph` → fitted `ArchitectureGraphView` + plain beat list (highlight on beat select).
2. Missing graph → static Input → Core → Output base SVG.
3. When `diagram.c4.diveTargets` is present, Dive opens C3 mermaid + caption for a container.
4. Otherwise Dive stays unavailable (no forced scroll/camera).

No graph mode may pin the page, scrub a camera, or turn normal scrolling into a
walkthrough.

## Next step

Keep local fixtures as fallback for repos without a remote graph (ada, gstf).
Remove fixtures only after every registry slug ships a validated
`docs/architecture.graph.json`. Expand C4 in those repos when ready for Dive.
