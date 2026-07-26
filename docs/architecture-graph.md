# Architecture graph IR (portfolio)

Owned graph IR for “How it works” maps on the portfolio. Mermaid stays canonical on **GitHub**; the site prefers this IR so every project can use the same rank/lane renderer and scrub tour later.

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
  "tour": ["a", "b", "c", "d"]
}
```

### Required vs optional

| Field | Required? | Notes |
|-------|-----------|--------|
| `version` | **yes** | Must be `1` |
| `nodes` | **yes** | Non-empty; unique `id`; non-empty `label` |
| `edges` | **yes** | Array (may be empty only for trivial maps; normally not) |
| `tour` | **yes** (portfolio) | 3–8 stops; each id is a **node** or **edge** id |
| `groups` | optional | Lane bands when present |
| `title` / `summary` / `notes` | optional | Visitor copy / honesty |
| `nodes[].kind` | optional | `input \| process \| decision \| store \| output \| other` |
| `nodes[].shape` | optional | `rect \| rounded \| diamond \| cylinder \| stadium` |
| `nodes[].groupId` | optional | Must reference a group |
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

### Groups → lanes

Use groups when the Mermaid has meaningful subgraphs (Inputs, Gateway, Modes). Untagged nodes share an extra lane. No groups → pure topological ranks.

### Writing `tour`

- One **primary happy path** (4–6 stops ideal, max 8).
- Multi-inputs can be **one beat** (tour the representative input, e.g. `upload` or `mic`, not every sibling).
- Prefer node ids; use edge ids only when the stop is specifically a branch label.
- Do not tour every alternate path (ADA cron/S3, PII batch) — dashed edges + `notes` are enough.
- Labels: plain English, visitor-friendly, no invented capabilities.

### Node budget

| Budget | Guidance |
|--------|----------|
| Ideal | 8–12 nodes |
| Soft warn | >12 |
| Hard fail | invalid refs, empty labels, tour out of range |

## Layout strategy

Implemented as pure `layoutArchitectureGraph()` in `src/lib/architecture-graph-layout.ts` (no Mermaid, no WebGL).

1. **Ranks** — topological order on **solid** edges (Kahn). Dashed edges do not force rank. Cyclic leftovers get best-effort rank after max predecessor.
2. **Lanes** — if `groups` exist and any node is grouped, each group is a horizontal lane (row). Ungrouped nodes share a final lane. Else single-lane **ranks** mode.
3. **Sibling stacking** — nodes that share `(rank, lane)` stack vertically in declaration order.
4. **Fan-in / fan-out** — natural: many edges into/out of a hub at its rank; no special Mermaid clustering.
5. **Decisions** — same placement rules; `shape: "diamond"` is a render hint only.
6. **Cycles / dashed** — marked `cyclic` or routed with a raised arc so back-edges stay readable; dashed style is preserved for the renderer to de-emphasize.

Coordinates are deterministic given the same IR + options.

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

| Project | Layout intent | Tour intent |
|---------|---------------|-------------|
| background-studio | lanes (inputs / exports) | Inputs → Store → Shader → Pass → Exports |
| sound-visualiser | lanes (audio-in / modes) | Audio → Engine → State → Mode → Canvas |
| pii-gateway | lanes (callers / gateway / batch) | Caller → Auth → Pipeline → Presidio → Artifacts |
| ada | lanes (ingress / core / truth) | Chat → Orch → Tools → DB (+ memory) |
| gstf | ranks (no groups) | Videos → Datasets → Phases → Checkpoint → Eval |

## Rollout steps (next pass)

1. Push `docs/architecture.graph.json` (+ optional `graph:`) into each curated repo; remove reliance on fixtures over time.
2. SVG/HTML renderer from `layoutArchitectureGraph` (static first).
3. Scrub / GSAP tour driven by `tour` on the project slug page.
4. Deprecate Mermaid render on the site once IR coverage is solid; keep `.mmd` for GitHub.
