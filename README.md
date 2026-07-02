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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve production build
```

## Resume

Place your PDF at `public/resume.pdf`. The nav and about page link to `/resume.pdf`.

## Adding a project

1. Add `portfolio.yaml` to the project repo (see [docs/contract.md](docs/contract.md)).
2. Add an entry to [`src/data/registry.ts`](src/data/registry.ts) (see [docs/registry.md](docs/registry.md)).
3. Add mock content to [`src/lib/mock-projects.ts`](src/lib/mock-projects.ts) until GitHub fetch is implemented.

## Current phase

Static UI shell with mock data. GitHub fetch, live demos, and API proxies are documented but not yet implemented.
