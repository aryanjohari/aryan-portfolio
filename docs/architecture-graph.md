# Architecture graph IR (portfolio)

Owned graph IR for “How it works” maps on the portfolio. Mermaid stays canonical on **GitHub**; the site prefers this IR so every project can use the same rank/lane renderer, path story, and optional dive.

Related: [contract.md](./contract.md), [streamline-project-docs.md](./streamline-project-docs.md).

## Why not Mermaid on the site

Fetched Mermaid differs wildly (linear pipeline, branched VJ, service map, multi-path agent, ML phases). One Mermaid dump is unreadable on a portfolio page. One owned IR + rank/lane layout + per-project `tour` keeps the site consistent while architectures stay different.

## Where files live

| Role | Location |
|------|----------|
| Schema + validation | `src/lib/architecture-graph.ts` |
| Rank / lane layout (pure) | `src/lib/architecture-graph-layout.ts` |
| Portfolio fixtures (rollout) | `src/data/architecture-graphs/<slug>.graph.json` |
| Validate fixtures | `npm run validate:graphs` |

**Recommendation (implement toward this):**

1. Author `docs/architecture.graph.json` in each **project repo** (alongside `docs/architecture.mmd`).
2. Optionally set `graph: docs/architecture.graph.json` in `portfolio.yaml`.
3. Portfolio fetch resolves IR the same way as Mermaid; if missing, falls back to portfolio-local fixtures under `src/data/architecture-graphs/`.
4. Keep `.mmd` for GitHub / mermaid.live; do **not** auto-generate IR from Mermaid in v1.

During rollout, fixtures in this repo are the source of truth until each project ships its own JSON.

## JSON shape

```json
{
  "version": 1,
  "title": "Optional display title",
  "summary": "One–two sentences: primary happy path.",
  "notes": "Optional: honest simplifications vs GitHub Mermaid.",
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
    { "id": "optional-edge-id", "from": "a", "to": "b", "label": "optional", "style": "solid" }
  ],
  "tour": ["a", "b", "c", "d"],
  "captions": [
    {
      "id": "a",
      "title": "Inputs",
      "body": "Three ways work enters the system.",
      "items": ["Upload image", "Pick a look", "Tune motion"]
    }
  ]
}
```

### Required vs optional

| Field | Required? | Notes |
|-------|-----------|--------|
| `version` | **yes** | Must be `1` |
| `nodes` | **yes** | Non-empty; unique `id`; non-empty `label` |
| `edges` | **yes** | Array (may be empty only for trivial maps; normally not) |
| `tour` | **yes** (portfolio) | 3–8 stops; each id is a **node** or **edge** id |
| `captions` | optional* | *Recommended for portfolio: title + body per tour stop; `items` for clusters |
| `groups` | optional | Lane bands when present |
| `title` / `summary` / `notes` | optional | Visitor copy / honesty |
| `nodes[].kind` | optional | `input \| process \| decision \| store \| output \| other` |
| `nodes[].shape` | optional | `rect \| rounded \| diamond \| cylinder \| stadium \| ticket` |
| `nodes[].groupId` | optional | Must reference a group |
| `nodes[].layout` | optional | Composition nudge: `dx`/`dy`/`x`/`y`/`scale`/`weight` |
| `skin` | optional | `studio \| sound \| pii \| ada \| gstf \| default` (slug fallback on site) |
| `edges[].id` | optional* | *Required if that edge appears in `tour` |
| `edges[].style` | optional | `solid` (default) or `dashed` |
| `edges[].label` | optional | Short; empty string rejected |

### Mapping from Mermaid (manual)

| Mermaid | IR |
|---------|-----|
| Node `[Label]` / `([Label])` / `[(Label)]` | `nodes[]` with `kind` + optional `shape` |
| `{Decision?}` | `kind: "decision"`, `shape: "diamond"` |
| `[(Store)]` / DB cylinder | `kind: "store"`, `shape: "cylinder"` |
| `subgraph id [Label]` | `groups[]` + `groupId` on members |
| `A --> B` | solid edge |
| `A -.-> B` | `style: "dashed"` |
| Cycles / feedback | Keep edge(s); layout arcs them; prefer dashed for secondary cycles |
| Nested service detail | Collapse into fewer portfolio nodes; put honesty in `notes` |

### Features we will **not** auto-import (v1)

- Mermaid `classDef` / `style` / `linkStyle` / colours
- `click` handlers, icons, markdown in labels beyond plain text
- Sequence / class / ER / state diagrams (flowchart only conceptually)
- Automatic subgraph nesting depth (one group level)
- Full Mermaid parser → IR (manual authoring for now)

## Authoring rules

### Dual source of truth

- **GitHub:** `docs/architecture.mmd` (and ARCHITECTURE.md) — full engineer-facing chart OK.
- **Portfolio:** `docs/architecture.graph.json` — **~8–12 visible nodes** (soft warn above 12). Collapse internals; do not invent features.

### Kinds

Tag for styling later; pick the closest honest kind:

- `input` — uploads, callers, sensors, configs that enter
- `process` — engines, pipelines, shaders, CLIs, phases
- `decision` — routers / diamonds
- `store` — DB, files, buffers, checkpoints, policy mounts
- `output` — exports, canvas, artifacts, published objects
- `other` — only if none fit

### Groups → columns

Use groups when the Mermaid has meaningful subgraphs (Inputs, Gateway, Modes). Each group becomes a left→right pipeline column. Untagged nodes share a trailing column. No groups → pure topological ranks.

### Writing `tour`

- One **primary happy path** spine (ideal **5–7** stops, max **8**). Prefer solo frames for mid-path process nodes; keep fan-in/out as clusters.
- Multi-inputs / multi-exports can be **one beat** (tour the representative node, e.g. `upload` or `mic`, with `captions[].items`).
- Prefer node ids; use edge ids only when the stop is specifically a branch label.
- Do not tour every alternate path (ADA cron/S3, PII batch) — dashed edges + `notes` are enough.
- Labels: plain English, visitor-friendly, no invented capabilities.

### Tour captions

Optional `captions[]` on the IR — one entry per `tour` stop — drives the void journey UI (`02 / 05`, title, body, optional bullets). Prefer authoring these on fixtures rather than inventing copy at render time.

```json
"captions": [
  {
    "id": "upload",
    "title": "Inputs",
    "body": "Three ways work enters the system.",
    "items": ["Upload a hero or overlay image", "Pick a look or mood", "Tune intensity, motion, and grit"]
  }
]
```

| Field | Required? | Notes |
|-------|-----------|--------|
| `id` | **yes** | Must match a `tour[]` entry |
| `title` | **yes** | Short; may rename a representative node to a cluster label (e.g. `upload` → “Inputs”) |
| `body` | **yes** | One dumb-simple sentence |
| `items` | optional | Plain-English children when the stop is a fan-in/out **cluster** |

When `items` is present (≥2), the camera frames the cluster (group siblings or fan co-targets) instead of a single box. Schema: `ArchitectureTourCaption` in `src/lib/architecture-graph.ts`. Resolver: `resolveTourStepsFromGraph`.

### Node budget

| Budget | Guidance |
|--------|----------|
| Ideal | 8–12 nodes |
| Soft warn | >12 |
| Hard fail | invalid refs, empty labels, tour out of range |

## Layout strategy

Implemented as pure `layoutArchitectureGraph()` in `src/lib/architecture-graph-layout.ts` (no Mermaid, no WebGL).

Composition goal: the overview should read as a **curated map** (hierarchy + asymmetry + air), not a default equal-box flowchart.

1. **Ranks** — topological order on **solid** edges (Kahn). Dashed edges do not force rank. Cyclic leftovers get best-effort rank after max predecessor.
2. **Columns (groups)** — if `groups` exist and any node is grouped, each group is a **vertical pipeline column** (Inputs → Core → Outputs). Ungrouped nodes share a trailing column. Else **ranks** mode (topo left→right).
3. **Column roles** — first column = ingress (top-biased satellites), middle = core (larger spine), last = egress (bottom-biased satellites). Gaps that touch core use `spineGapMul` for breathing room.
4. **Sibling stacking** — nodes in the same column stack by topo then declaration. Stack gaps tighten for satellites and open around spine pieces. Ingress/egress stagger horizontally (±`staggerX`); columns are **not** perfectly centered clones.
5. **Weight + scale** — `input`/`output` → quieter satellites; tour `process`/`store`/`decision` → spine. Core process nodes get `coreProcessScale`. Optional per-node `layout` overrides.
6. **Fan-in / fan-out** — travel lines exit/enter node sides; parallel elbows stagger so edges don’t stack.
7. **Cycles / dashed** — marked `cyclic` or routed with a raised arc; dashed style is preserved for the renderer to de-emphasize.

Coordinates are deterministic given the same IR + options.

### Optional node `layout` hints

Prefer the algorithmic composition. Hand-nudge focal nodes when a map still feels too systematic:

```json
{
  "id": "look",
  "label": "Look engine",
  "kind": "process",
  "groupId": "core",
  "layout": { "weight": "spine", "scale": 1.26, "dx": 0, "dy": 0 }
}
```

| Field | Notes |
|-------|--------|
| `dx` / `dy` | Nudge after placement (portable; preferred) |
| `x` / `y` | Absolute world override (last resort) |
| `scale` | Mul vs role default (clamped ~0.7–1.4) |
| `weight` | `spine` \| `normal` \| `satellite` — overview chrome |

### Tunables (`JOURNEY_LAYOUT`)

| Key | Role |
|-----|------|
| `rankGap` / `spineGapMul` / `ranksGapMul` | Column air; core breathing; dense topo pipelines |
| `stackGap` / `satelliteStackGap` | Vertical air in core vs satellites |
| `nodeWidth` / `nodeHeight` | Base size before weight scale |
| `padding` / `groupLabelH` | Stage margins |
| `spineScale` / `satelliteScale` / `coreProcessScale` | Hierarchy |
| `staggerX` | Horizontal satellite stagger |
| `ingressYBias` / `coreYBias` / `egressYBias` | Vertical asymmetry |

Overview fit uses `fitOverviewPose` (nodes + groups + edge routes, no dive cluster min-floor). Width: how-it-works is near-full viewport; path story stays a readable column.

### Node kind visual language

| Kind | Default shape | Chrome |
|------|---------------|--------|
| `input` | stadium (chip) | Pill + left accent bar |
| `process` | rounded (tablet) | Bezeled rounded rect |
| `store` | cylinder | DB-style cylinder |
| `decision` | diamond | Diamond |
| `output` | ticket | Notch on trailing edge |
| `other` | rounded | Plain tablet |

Optional `skin` (`studio` \| `sound` \| `pii` \| `ada` \| `gstf`) or slug fallback sets subtle accent / edge tokens — cream contours on void, not rainbow. Overview also uses `data-weight` for spine vs satellite depth.

## Fetch integration

Build-time (`scripts/fetch-portfolio-yaml.ts`):

1. Fetch Mermaid as today (`diagram:` → `.mmd` fallbacks → markdown fence → base).
2. Fetch graph: `graph:` path → `docs/architecture.graph.json` → **local fixture** by slug.
3. Store on `ProjectDiagramData`: `mermaid?`, `graph?`, `graphSource`, `graphPath`.
4. Runtime merge (`projects.ts`) also attaches local fixtures if fetch JSON lacks `graph`.

**Migration:** Mermaid fetch stays. Site may keep Mermaid SVG temporarily. Next pass: prefer IR → SVG/HTML; if no IR, base Input→Core→Output.

`portfolio.yaml` additions:

```yaml
diagram: docs/architecture.mmd          # GitHub + temporary site Mermaid
graph: docs/architecture.graph.json     # preferred site map (optional until shipped in repo)
```

## Current fixtures (matrix)

Run `npm run validate:graphs` for live counts. Expected shape:

| Project | Layout intent | Tour intent (path story) | Skin |
|---------|---------------|--------------------------|------|
| background-studio | columns (inputs / core / exports) | Inputs → Core → Pass → Exports (4) | studio |
| sound-visualiser | columns (audio-in / hear / modes / out) | Audio → Hear → Route → Modes → Canvas (5) | sound |
| pii-gateway | columns (callers / gateway / batch) | Callers → Gateway → Pipeline → Presidio → Artifacts (5) | pii |
| ada | columns (ingress / core / truth) | Chat → Orch → Tools → DB → Memory (5) | ada |
| gstf | ranks (no groups) | Videos → Datasets → Phases → Ckpt → Eval (5) | gstf |

All curated fixtures use `journeyMode: "overview-story"`. Default page UX: fitted map + path captions; **Dive into architecture** is optional.

### Project slug page chapters (first draft)

`/projects/[slug]` is a short case study with a map — readable with motion mostly off:

1. **Hero** — badge, title, full description, CTAs (demo / GitHub / docs / back). Soft enter OK; content scrolls away naturally (no exit theatre).
2. **How it works** — path story (tour + captions) + full owned graph overview fitted once. Beat select only highlights the map.
3. **Dive (optional)** — “Dive into architecture” dialog; not forced by page scroll.
4. **Stack + details** — tags, status, links.

Atmosphere stays ambient background only. Animation polish / showcase handoffs deferred.

## Rollout steps (next pass)

1. Push `docs/architecture.graph.json` (+ optional `graph:`) into each curated repo; remove reliance on fixtures over time.
2. ~~SVG/HTML renderer from `layoutArchitectureGraph` (static first).~~ → `ArchitectureGraphView` + `ProjectDiagram` (IR primary).
3. ~~Scrub / GSAP tour driven by `tour` on the project slug page.~~ → **overview + optional dive** (`ArchitectureJourney`): fitted map, path story beats, on-demand dive with light focus; reduced-motion keeps the same structure without entrance motion.
4. Deprecate Mermaid render on the site once IR coverage is solid; keep `.mmd` for GitHub.

### Site render fallback

1. **Owned IR** (`diagram.graph`) → `ArchitectureJourney` (overview stage + path story + optional dive dialog).
2. **Base** Input→Core→Output SVG when no IR (stepped captions, no pin quest).
3. **Mermaid** only in the “View full architecture” overlay when no IR but `.mmd` was fetched — never the default scroll view.

### Overview vs dive

| Mode | Camera | Interaction |
|------|--------|-------------|
| **Overview** (default) | Fitted whole-graph pose | Click / select numbered path beats → spotlight nodes/edges |
| **Dive** (optional) | Light per-stop zoom | Dialog: Prev/Next + keyboard; Exit dive / Escape |

- Animate the **camera / world children**, never a pinned section root.
- Focus opacity + tour classes: **one** `applyStopFocus` owner per stop change.
- Overview stage: void-friendly but not a full-viewport pin prison; prose + captions teach.
- `prefers-reduced-motion`: instant final states; path story + map still usable.
- Captions: `captions[]` on IR → path story + dive captions (`title`, `body`, optional `items` / `spotlightIds`).

<!-- Optional later: case-study fields in portfolio.yaml (problem / approach / outcome) can feed hero or coda without changing the graph IR. -->
