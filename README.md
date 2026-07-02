# aryan-portfolio

A curated **workshop index** portfolio — a terminal-style catalog of selected GitHub projects with narrative pages and optional live demo panels.

Built with Next.js 16, React, Tailwind CSS, and TypeScript. Monospace aesthetic, flat UI, no WebGL in the shell.

## Documentation

All design and architecture decisions live in [`docs/MASTER.md`](docs/MASTER.md). Start there.

| Doc | Topic |
|-----|-------|
| [docs/MASTER.md](docs/MASTER.md) | Vision, principles, doc index |
| [docs/architecture.md](docs/architecture.md) | Data flow, build strategy |
| [docs/contract.md](docs/contract.md) | `portfolio.yaml` schema |
| [docs/ui.md](docs/ui.md) | Design tokens, wireframes |
| [docs/registry.md](docs/registry.md) | Adding projects, wiring demos |

## Development

```bash
npm install
cp .env.example .env.local   # optional: GITHUB_TOKEN, PORTFOLIO_FETCH_SKIP
npm run fetch:projects       # fetch portfolio.yaml from GitHub (optional locally)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dev without GitHub fetch

```bash
PORTFOLIO_FETCH_SKIP=true npm run dev
```

Uses mock data from `src/lib/mock-projects.ts` instead of fetched content.

```bash
npm run build   # runs fetch:projects via prebuild, then next build
npm run start   # serve production build
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | GitHub API token for fetching `portfolio.yaml` from private repos. Public repos work without it. |
| `PORTFOLIO_FETCH_SKIP` | Set to `true` to skip fetch and use mock data. |

See [`.env.example`](.env.example) for template values.

## Vercel deployment

1. Add `GITHUB_TOKEN` in Vercel project settings (Production + Preview).
2. `prebuild` runs `npm run fetch:projects` automatically on each deploy.
3. Token is used only at build time — never exposed to the client.

## Resume

Place your PDF at `public/resume.pdf`. The nav and about page link to `/resume.pdf`.

## Adding a project

1. Add `portfolio.yaml` to the project repo (see [docs/contract.md](docs/contract.md)).
2. Add an entry to [`src/data/registry.ts`](src/data/registry.ts) (see [docs/registry.md](docs/registry.md)).
3. Run `npm run fetch:projects` or deploy — content is fetched at build time.

## Current phase

Build-time GitHub fetch for `portfolio.yaml` is live. Iframe demos are wired for background-studio and sound-visualiser. API proxies and exhibit assets are documented for Phase 3.
