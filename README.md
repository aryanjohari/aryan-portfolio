# aryan-portfolio

A curated **workshop** portfolio — narrative homepage with an AI guide, plus a terminal-style catalog of selected GitHub projects with narrative pages and optional live demo panels.

Built with Next.js 16, React, Tailwind CSS, and TypeScript. Monospace aesthetic, flat UI, no WebGL in the shell.

## Documentation

All design and architecture decisions live in [`docs/MASTER.md`](docs/MASTER.md). Start there.

| Doc | Topic |
|-----|-------|
| [docs/MASTER.md](docs/MASTER.md) | Vision, principles, doc index |
| [docs/architecture.md](docs/architecture.md) | Data flow, build strategy |
| [docs/archive/contract.md](docs/archive/contract.md) | `portfolio.yaml` schema |
| [docs/ui.md](docs/ui.md) | Design tokens, wireframes |
| [docs/guide.md](docs/guide.md) | Portfolio guide, Gemini setup |
| [docs/registry.md](docs/registry.md) | Adding projects, wiring demos |

## Development

```bash
npm install
cp .env.example .env.local   # optional: GEMINI_API_KEY
npm run dev                  # builds the Ask index from content/ first
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test        # node:test unit tests
npm run build   # prebuild validates content/ and builds the Ask index, then next build
npm run start   # serve production build
```

All content lives in `content/` in this repo (see `docs/V2_PLAN.md` §15). Nothing is fetched from other repos.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for `/api/ask`. Server-side only. Without it the Ask box is off and the index has no embeddings (keyword search). |
| `GEMINI_MODEL` | Optional. Answer model; default `gemini-3.5-flash-lite`. |
| `GEMINI_EMBEDDING_MODEL` | Optional. Embedding model; default `gemini-embedding-2`. Changing it means re-checking `MIN_EMBEDDING_SCORE` in `src/lib/ask/retrieve.ts`. |

See [`.env.example`](.env.example) for template values.

## Vercel deployment

1. Add `GEMINI_API_KEY` for the Ask box (Production + Preview). The build uses it too, to embed the sections.
2. `prebuild` validates `content/` and builds the Ask index on each deploy.
3. The key is used only on the server, never exposed to the client.

## Resume

Place your PDF at `public/resume.pdf`. The nav and about page link to `/resume.pdf`.

## Adding a project

1. Add `content/projects/<slug>.md`: facts in the frontmatter (fields: `src/lib/portfolio-schema.ts`), the story as `## ` sections (headings: `STORY_HEADINGS` there).
2. Run `npm run build`: a missing or bad field, or an unknown heading, fails the build.

## Current phase

v2 rebuild on branch `v2-simple`; see `docs/V2_PLAN.md` §13 for the phases. Layout mockups live in `mockups/`.
