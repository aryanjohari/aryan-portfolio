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
  repo: string;      // "owner/repo-name"
  slug: string;      // URL slug, kebab-case
  demo?: DemoConfig; // omit = no live demo UI
};
```

## Adding a project

1. **Add `portfolio.yaml`** to the project repo (see [contract.md](./contract.md)).
2. **Add a registry entry** in `src/data/registry.ts`:

```typescript
{
  repo: "aryanjohari/my-new-project",
  slug: "my-new-project",
  // demo optional — omit until ready
},
```

3. **Add mock content** (scaffold only) in `src/lib/mock-projects.ts` until GitHub fetch is implemented.
4. **Rebuild** — the index and project page generate automatically from the registry.

## Removing a project

Delete the entry from `registry.ts` and remove the mock entry from `mock-projects.ts`. The project page will 404 and the index row disappears on next build.

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

To wire another iframe demo (e.g. sound-visualiser):

```typescript
{
  repo: "aryanjohari/sound-visualiser",
  slug: "sound-visualiser",
  demo: { type: "iframe", url: "https://your-deployed-demo.example.com" },
},
```

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
| GitHub link | YAML |
| External demo link (plain `<a>`) | YAML `links.demo` |
| Embedded demo (iframe, API, exhibit, edge) | Registry `demo` only |

**Registry demo always overrides YAML `links.demo` for embedded rendering.** If both exist, the registry demo is used in the demo panel; YAML `links.demo` can still appear as an external link in the narrative column.

## Current seeded projects

| Slug | Repo | Demo |
|------|------|------|
| `background-studio` | `aryanjohari/background-studio` | iframe → `https://music.arkhives.nz` |
| `sound-visualiser` | `aryanjohari/sound-visualiser` | not wired |
| `pii-gateway` | `aryanjohari/pii-gateway` | not wired |
| `ada` | `aryanjohari/ada` | not wired |
| `gstf` | `aryanjohari/gstf` | not wired |

## Checklist for new projects

- [ ] `portfolio.yaml` committed to project repo
- [ ] Registry entry added with correct `repo` and `slug`
- [ ] Mock entry added (until fetch is live)
- [ ] Demo wired in registry (if applicable)
- [ ] Proxy route created (for `api` / `edge` types)
- [ ] Build passes: `npm run build`
