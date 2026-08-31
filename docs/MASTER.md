# Portfolio — Master Directives

This document is the entry point for all portfolio decisions. Read it first before changing code or content.

## What this site is

A **curated project portfolio** — a terminal-style site with a narrative homepage and catalog of selected projects hosted on GitHub. Each project has a dedicated page with narrative content and an optional live demo panel. The home-page Portfolio Guide is the primary interaction surface. The portfolio is an editorial interface over GitHub repos, not a raw README browser.

Visitors should understand what a project does, see its stack and status, and try a demo when one is wired.

## What this site is not

- **Not a README browser.** Project READMEs stay in each repo for contributors. Visitor-facing copy lives in `portfolio.yaml`.
- **Not a WebGL showcase.** The portfolio shell is flat, monospace, and fast. Demos may use rich tech inside their sandbox panel, but the site chrome stays minimal.
- **Not an automatic GitHub listing.** Only projects in the portfolio registry appear on the index. Curation is intentional.
- **Not a contact page.** Contact links live in the global footer on every page.

## Principles

1. **Monospace terminal aesthetic** — off-white background, deep black text, catalog/table feel.
2. **Flat UI** — 1px borders, no blur, no scroll hijacking, no animation libraries in the shell.
3. **Content from YAML, demos from registry** — `portfolio.yaml` in each project repo supplies narrative content; demo wiring is always manual in this repo.
4. **Build-time fetch** — project content is fetched at build time (Phase 2), not client-side at runtime.
5. **Security by default** — no API keys or private endpoints in client code; proxy through Next.js API routes.

## Routes

| Route              | Purpose                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `/`                | Home — slim intro + portfolio guide (primary interaction)                              |
| `/projects`        | Projects index — curated gallery (one viewport, drag carousel)                       |
| `/about`           | Void blog read (void-scroll portal): philosophy, background, education, availability, resume |
| `/projects/[slug]` | Exhibit (void-scroll portal): hero, CTAs, optional stage, case study, continue             |
| `/resume.pdf`      | Static PDF in `public/resume.pdf`                                                      |

**Routing note:** Never link to `/index` in nav or copy — Next.js/Vercel may alias it to `/`. Legacy `/index` and `/workshop` URLs redirect permanently to `/projects` via `next.config.ts`.

## Documentation index

| Document                                                   | Purpose                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [architecture.md](./architecture.md)                       | Data flow, build strategy, folder structure, security                |
| [contract.md](./contract.md)                               | `portfolio.yaml` schema, validation, examples                        |
| [create-portfolio-yaml.md](./create-portfolio-yaml.md)     | Cursor prompt to generate portfolio.yaml in project repos            |
| [streamline-project-docs.md](./streamline-project-docs.md) | Cursor prompt to streamline GitHub + portfolio docs in project repos |
| [ui.md](./ui.md)                                           | Design tokens, wireframes, components, responsive rules              |
| [void-chrome-transitions.md](./void-chrome-transitions.md) | Morph-first home ↔ site chrome navigation (why + how)                |
| [registry.md](./registry.md)                               | How to add/remove projects and wire demos                            |
| [v2-roadmap.md](./v2-roadmap.md)                           | v2 phases (homepage narrative, guide, remaining demos)               |
| [guide.md](./guide.md)                                     | Portfolio guide API, context build, env setup, testing               |
| [ship-checklist.md](./ship-checklist.md)                   | Pre-deploy verification steps                                        |

## Current phase

**Phase 5 (done) — ship-ready freeze:** Mobile/layout polish, nav clarity (`/projects` canonical), guide JSON-leak hardening, exhibit slug polish, docs + ship checklist. See [ship-checklist.md](./ship-checklist.md) before deploy.

**Phase 1 (done):** Static UI shell, mock project data, full documentation.

**Phase 2 (done / partial):** Build-time fetch of `portfolio.yaml` from GitHub, per-project content status UI, iframe demos live. API proxies and exhibit assets remain.

**Phase 3 (later):** GitHub Action deploy hook, additional demo types, production hardening.

**Phase 4 (done):** Route split (`/` guide home, `/projects` gallery). Portfolio Guide live via Gemini. Case studies, knowledge bank, home chips/tags, about essay, yaml fetch.

## Quick reference

- **Add a project:** [registry.md](./registry.md)
- **Generate yaml for a project:** [create-portfolio-yaml.md](./create-portfolio-yaml.md)
- **Change design:** [ui.md](./ui.md)
- **Change data contract:** [contract.md](./contract.md)
- **Understand build flow:** [architecture.md](./architecture.md)
- **Pre-deploy:** [ship-checklist.md](./ship-checklist.md)
