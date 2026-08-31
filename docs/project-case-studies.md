# Project case studies

Authored **Problem → Approach → Outcome** copy for the “Case study / In brief” section on `/projects/[slug]`.

## Source file

[`content/project-case-studies.json`](../content/project-case-studies.json)

Each registry slug has three plain-English beats (~1–2 sentences, max 320 characters each). Facts must come from fetched project YAML and repo-linked content — do not invent metrics or features.

## Relationship to yaml

| Source | Used for |
|--------|----------|
| Remote `portfolio.yaml` (`summary`, `description`, `stack`, links) | Hero lede, stack marquee, architecture graph, guide context |
| `project-case-studies.json` | Exhibit “In brief” beats only |

Hero lede stays `description`. Case beats are separate narrative and should not repeat the lede sentence-for-sentence.

## Adding a registry project

1. Add the repo to [`src/data/registry.ts`](../src/data/registry.ts).
2. Run `npm run fetch:projects` so yaml facts land in `fetched-projects.json`.
3. Add a `"<slug>"` entry under `studies` in `project-case-studies.json` with `problem`, `approach`, and `outcome`.
4. Run `npm run validate:case-studies` — build fails if any registry slug is missing or invalid.

## Resolver

[`src/lib/exhibit-case.ts`](../src/lib/exhibit-case.ts) exports `exhibitCaseBeats(project)`. Authored copy is returned as-is; unknown slugs fall back to yaml heuristics (clipped) for future repos.
