# Streamline project docs (GitHub + portfolio)

Paste this prompt into Agent mode in each curated project repo when you are ready to sync docs with the portfolio fetch contract. Use it after site polish — or whenever a project’s GitHub + `portfolio.yaml` / architecture docs need a full pass — not while still iterating on the portfolio shell itself.

Related docs: [contract.md](./contract.md), [create-portfolio-yaml.md](./create-portfolio-yaml.md), [registry.md](./registry.md).

## Cursor prompt (verbatim)

Copy everything inside the block below into Cursor Agent mode in a project repo:

````text
# Streamline project docs for GitHub + aryan-portfolio (full suite)
You are documenting THIS repository so it is (1) clear to GitHub visitors, (2) correctly consumed by my personal portfolio site at build time, and (3) honest about custom / non-standard architecture I invented or adapted here.
## Why these docs exist (audiences)
| File | Audience | Job |
|------|----------|-----|
| `portfolio.yaml` | Portfolio site + Gemini guide | Short visitor copy only |
| `docs/architecture.mmd` | GitHub + temporary portfolio Mermaid | One accurate Mermaid flowchart |
| `docs/architecture.graph.json` | Portfolio owned map (preferred) | Graph IR + tour — see portfolio `docs/architecture-graph.md` |
| `docs/ARCHITECTURE.md` | Engineers / interviewers on GitHub | Deeper case study of design & tradeoffs |
| `README.md` | Developers who clone | Run, install, test, contribute |
| `PROJECT.md` (optional) | Narrative overview on GitHub | Story + link to architecture; keep mermaid IN SYNC with `.mmd` or omit mermaid here |
Do NOT dump everything into one file. Do NOT invent features, metrics, demos, or URLs.
## Portfolio fetch contract (must match exactly)
The portfolio fetches:
1. Root `portfolio.yaml` (required)
2. Architecture Mermaid, first match:
   - `diagram:` path in yaml if set
   - else `docs/architecture.mmd`
   - else `docs/architecture.mermaid`
   - else first ```mermaid fence in `docs/ARCHITECTURE.md` → `PROJECT.md` → `docs/architecture.md`
3. Owned architecture graph IR (preferred for site maps), first match:
   - `graph:` path in yaml if set
   - else `docs/architecture.graph.json`
   - else portfolio-local fixture while rolling out
4. Optional C4 Dive artifacts (fail soft):
   - `docs/c4/portfolio-map.json` (dive targets), else infer `docs/c4/3-components/*.mmd`
   - `docs/c4/1-context.*`, `docs/c4/2-containers.*`, `docs/c4/3-components/<id>.*`
5. Else portfolio shows a generic base diagram
Prefer shipping **`docs/architecture.mmd`** (GitHub) and **`docs/architecture.graph.json`** (portfolio), and set in yaml:
`diagram: docs/architecture.mmd`
`graph: docs/architecture.graph.json`
### portfolio.yaml schema
```yaml
title: string
summary: string           # ONE line for workshop card, ≤120 chars; NOT a paste of description
description: string       # 2–6 sentences for project page; different from summary; plain English
stack: string[]           # real tech only
status: active | wip | archived
links:
  github: string          # this repo URL
  demo?: string           # ONLY if publicly live today
  docs?: string           # ONLY if real docs URL exists
diagram?: string          # e.g. docs/architecture.mmd
Optional slug kebab-case only if needed.

Phase 1 — Read and understand (do this before writing)
Explore the whole codebase thoroughly:

Entry points, main pipelines, API routes, workers, shaders, configs, tests, Docker/CI
README / existing PROJECT.md / plans / comments
What is standard vs custom (novel algorithms, unusual dataflow, handmade protocols, non-obvious architecture, experimental approaches)
Eye-catching logic: hard problems solved, clever constraints (edge/Pi, privacy, GPU, realtime, batch, etc.)
What is actually implemented vs planned/TODO
Write a short internal brief (in the chat) before editing files:

Premise (one paragraph)
Unique approach (bullet list)
Verified stack
Verified demo URL or none
Suggested status
Phase 2 — Write / update files
1) portfolio.yaml
Visitor tone: recruiters + non-tech can understand
summary = hook; description = what it does / who for / one concrete true detail
No install steps, no “portfolio.yaml”, no registry talk
Prefer diagram: docs/architecture.mmd
2) docs/architecture.mmd
Single Mermaid flowchart (or flowchart TB/LR) of the REAL system
Visitor-friendly node labels (plain language), but structurally accurate
Show main data/control flow; omit tiny helpers unless essential
Reflect custom architecture clearly (don’t force a generic CRUD shape if this project isn’t that)
Keep it readable on a portfolio page (aim ~8–20 nodes, not 50)
3) docs/ARCHITECTURE.md
GitHub case study structure (use these headers for consistency across repos):

# Architecture — <Project Title>
## Premise
## Goals and non-goals
## Unique approach
## System overview
(link to docs/architecture.mmd — and optionally embed the same mermaid fence kept in sync)
## Key components
## Data / control flow
## Notable implementation details
(custom logic, algorithms, constraints, edge cases you verified in code)
## Tradeoffs and limitations
## How to verify locally
(short pointers into README — don’t duplicate full install)
4) README.md
Keep developer-focused. Standard-ish sections:

What / Why (short)
Features (verified)
Quick start
Config / env
Tests / CI
Architecture → link docs/ARCHITECTURE.md + docs/architecture.mmd
License if any
Optional one line: Visitor overview: see portfolio.yaml.
5) PROJECT.md (optional)
Only if useful for GitHub browsing. If it includes mermaid, it MUST match architecture.mmd. Prefer linking to ARCHITECTURE.md instead of duplicating.

Quality bar
Same header conventions across my repos (as above)
Accurate to code; call out original/custom design explicitly under Unique approach
Diagram and yaml ready for portfolio rebuild after push
No secrets in docs
Output
Chat brief (premise / unique / stack / demo / status)
Create or update the files listed
Summarize what changed and what the portfolio will pick up (portfolio.yaml + which diagram path)
List open questions if something couldn’t be verified from the repo
Do not
Fabricate live demos, users, or metrics
Replace working custom design docs with generic boilerplate that hides what makes this project mine
Put full case-study essays into portfolio.yaml
````

## How to use

Open a curated project repo → Agent mode → copy the verbatim prompt → review the result → push to main → in this portfolio run `npm run fetch:projects` / redeploy.
