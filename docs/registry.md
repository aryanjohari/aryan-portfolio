# Portfolio Registry

The registry (`src/data/registry.ts`) is the **curation layer** for this portfolio. It controls which projects appear on the index and how demos are wired.

## Location

```
src/data/registry.ts
```

## Types

```typescript
type DemoConfig =
  | { type: "iframe"; url: string }
  | { type: "api"; proxyPath: string }
  | { type: "exhibit"; assetsPath?: string }
  | { type: "edge"; proxyPath: string };

type RegistryEntry = {
  repo: string;       // "owner/repo-name"
  slug: string;       // URL slug, kebab-case
  branch?: string;    // default "main"
  demo?: DemoConfig;  // omit = no live demo UI
};
```

## Adding a project

1. **Add `portfolio.yaml`** to the project repo (see [contract.md](./contract.md)).
2. **Add a registry entry** in `src/data/registry.ts`:

```typescript
{
  repo: "aryanjohari/my-new-project",
  slug: "my-new-project",
  // branch optional — defaults to "main"
  // demo optional — omit until ready
},
```

3. **Fetch content** — run `npm run fetch:projects` (or let `prebuild` run it on deploy). Repos without yaml yet show a "yaml not configured" state but still appear on the index.
4. **Rebuild** — the index and project page generate automatically from the registry.

### Dev without fetch

Set `PORTFOLIO_FETCH_SKIP=true` in `.env.local` to use mock data from `src/lib/mock-projects.ts` instead of live fetch. Add a mock entry there only when developing UI without GitHub access.

## Removing a project

Delete the entry from `registry.ts`. The project page will 404 and the index row disappears on next build.

## Slug conventions

- Use **kebab-case**: `pii-gateway`, not `pii_gateway` or `PiiGateway`
- Default slug = repo name if omitted in YAML
- Slug must be unique across the registry
- URL: `/projects/{slug}`

## Wiring demos

Demos are **always manual**. Omitting `demo` means the index shows `—` and the project page shows "Demo not wired".

### iframe

For deployed frontends. **Implemented and live** — `DemoPanel` embeds the URL in a sandboxed iframe with loading and fallback states.

```typescript
{
  repo: "aryanjohari/background-studio",
  slug: "background-studio",
  demo: { type: "iframe", url: "https://music.arkhives.nz" },
}
```

The index table shows **try demo** when `demo` is set. If the target site blocks embedding (X-Frame-Options / CSP), the panel shows a fallback with an **open in new tab** link instead of a broken empty frame.

Iframe demos work regardless of whether `portfolio.yaml` is configured.

### api

For interactive API playgrounds proxied through Next.js:

```typescript
{
  repo: "aryanjohari/pii-gateway",
  slug: "pii-gateway",
  demo: { type: "api", proxyPath: "/api/demo/pii-gateway" },
}
```

Implement the proxy route in `src/app/api/demo/pii-gateway/route.ts` (Phase 2). Never expose API keys client-side.

### exhibit

For static artifacts (images, metrics JSON):

```typescript
{
  repo: "aryanjohari/gstf",
  slug: "gstf",
  demo: { type: "exhibit", assetsPath: "/exhibits/gstf" },
}
```

Store assets in `public/exhibits/gstf/` or fetch at build time.

### edge

For proxied edge devices (e.g. Raspberry Pi):

```typescript
{
  repo: "aryanjohari/ada",
  slug: "ada",
  demo: { type: "edge", proxyPath: "/api/demo/ada" },
}
```

Device URL and credentials live only in server environment variables.

## Registry vs YAML

| Concern | Source |
|---------|--------|
| Which projects appear | Registry |
| Title, summary, description, stack, status | YAML (`portfolio.yaml`) |
| GitHub link | YAML (placeholder from registry repo when yaml missing) |
| External demo link (plain `<a>`) | YAML `links.demo` |
| Embedded demo (iframe, API, exhibit, edge) | Registry `demo` only |

**Registry demo always overrides YAML `links.demo` for embedded rendering.** If both exist, the registry demo is used in the demo panel; YAML `links.demo` can still appear as an external link in the narrative column.

## Current seeded projects

| Slug | Repo | Demo |
|------|------|------|
| `background-studio` | `aryanjohari/background-studio` | iframe → `https://music.arkhives.nz` |
| `sound-visualiser` | `aryanjohari/sound-visualiser` | iframe → `https://image.arkhives.nz` |
| `pii-gateway` | `aryanjohari/pii-gateway` | not wired |
| `ada` | `aryanjohari/ada` | not wired |
| `gstf` | `aryanjohari/gstf` | not wired |

## Checklist for new projects

- [ ] `portfolio.yaml` committed to project repo
- [ ] Registry entry added with correct `repo`, `slug`, and optional `branch`
- [ ] `npm run fetch:projects` succeeds (or shows `missing_yaml` until yaml is added)
- [ ] Demo wired in registry (if applicable)
- [ ] Proxy route created (for `api` / `edge` types)
- [ ] Build passes: `npm run build`
