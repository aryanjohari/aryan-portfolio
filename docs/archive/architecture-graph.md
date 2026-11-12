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
- C4 Context→Containers→Components UI: `src/components/ArchitectureJourney.tsx`
- Temporary local fixtures: `src/data/architecture-graphs/<slug>.graph.json`
- Validation: `npm run validate:graphs`

Local fixtures remain temporary until repository fetches for
`docs/architecture.graph.json` are verified.

## Repository contract

Projects should keep:

- `docs/c4/` — **preferred** Context / Containers / Components + `portfolio-map.json`
- `docs/architecture.graph.json` — fallback portfolio map when C4 Mermaid is missing
- `docs/architecture.mmd` — optional engineer-facing Mermaid
- `portfolio.yaml` entries for `graph` and/or `diagram`

The portfolio fetch pipeline resolves C4 docs first for the project page
architecture section. Owned graph IR is kept as a soft fallback while some
repos lag. Mermaid remains in the fetch contract for GitHub + C4 rendering.

C4 uses `docs/c4/portfolio-map.json` with either:
- **new:** `defaultLevel`, `zoom[]`, `componentZooms[]`
- **legacy:** `diveTargets` / `containersWithComponents`

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

1. `diagram.c4` with Context and/or Containers Mermaid → Context-first zoom UI
   (See how it’s built → Containers; container zoom → Components dive).
2. Else `diagram.graph` → fitted `ArchitectureGraphView` + plain beat list.
3. Missing graph → static Input → Core → Output base SVG.
4. When `diagram.c4.diveTargets` / component docs exist, Dive opens C3 mermaid.
5. Otherwise Dive stays unavailable (no forced scroll/camera).

No graph mode may pin the page, scrub a camera, or turn normal scrolling into a
walkthrough.

## Next step

Keep local fixtures as fallback for repos without a remote graph (ada, gstf).
Remove fixtures only after every registry slug ships a validated
`docs/architecture.graph.json`. Expand C4 in those repos when ready for Dive.
