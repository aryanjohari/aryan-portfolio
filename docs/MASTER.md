# Workshop Index — Master Directives

This document is the entry point for all portfolio decisions. Read it first before changing code or content.

## What this site is

A **curated workshop index** — a terminal-style catalog of selected projects hosted on GitHub. Each project has a dedicated page with narrative content and an optional live demo panel. The portfolio is an editorial interface over GitHub repos, not a raw README browser.

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

| Route | Purpose |
|-------|---------|
| `/` | Terminal-style index table of all curated projects |
| `/about` | Bio, education, availability, resume link |
| `/projects/[slug]` | Split layout: narrative left, demo panel right |
| `/resume.pdf` | Static PDF in `public/resume.pdf` (not committed by default) |

## Documentation index

| Document | Purpose |
|----------|---------|
| [architecture.md](./architecture.md) | Data flow, build strategy, folder structure, security |
| [contract.md](./contract.md) | `portfolio.yaml` schema, validation, examples |
| [create-portfolio-yaml.md](./create-portfolio-yaml.md) | Cursor prompt to generate portfolio.yaml in project repos |
| [ui.md](./ui.md) | Design tokens, wireframes, components, responsive rules |
| [registry.md](./registry.md) | How to add/remove projects and wire demos |

## Current phase

**Phase 1 (done):** Static UI shell, mock project data, full documentation.

**Phase 2 (in progress / partial):** Build-time fetch of `portfolio.yaml` from GitHub, per-project content status UI, iframe demos live. API proxies and exhibit assets remain.

**Phase 3 (later):** GitHub Action deploy hook, additional demo types, production hardening.

## Quick reference

- **Add a project:** [registry.md](./registry.md)
- **Generate yaml for a project:** [create-portfolio-yaml.md](./create-portfolio-yaml.md)
- **Change design:** [ui.md](./ui.md)
- **Change data contract:** [contract.md](./contract.md)
- **Understand build flow:** [architecture.md](./architecture.md)
