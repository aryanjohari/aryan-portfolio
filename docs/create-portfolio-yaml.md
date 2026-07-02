# Creating portfolio.yaml

Use this when opening any curated project repo in Cursor to generate visitor-facing copy at the repo root.

For the full schema, validation rules, and examples, see [contract.md](./contract.md).

## Cursor prompt

Copy everything inside the block below into Cursor when opened in a project repo:

````text
Create `portfolio.yaml` at the root of THIS repository.

## What this file is for
My personal portfolio site reads this file from GitHub at build time. It is visitor-facing content only — not a README replacement. Keep README technical; this file explains the project in plain language for recruiters and engineers before they try a demo.

## Required schema (match exactly)
```yaml
title: string
summary: string           # one line, max ~120 characters
description: string       # 2–6 sentences, plain English
stack: string[]
status: active | wip | archived
links:
  github: string          # full URL to this repo
  demo?: string           # only if publicly deployed today
  docs?: string           # only if real docs exist
```
Optional: slug (kebab-case) — omit unless repo name is a bad slug.

## How to write it
Read README.md and scan the codebase to confirm what the project actually does and which technologies are used.

- summary — one clear sentence: what it is (fits a table row).
- description — what it does, who it's for, one concrete detail (metric, feature, or outcome) if accurate.
- stack — real tools only (e.g. Python, FastAPI, Presidio) — not vague labels like "backend" or "ML".
- status — active if showcase-ready; wip if incomplete; archived only if historical.
- links.github — use this repo's GitHub URL (infer from git remote if needed).
- links.demo — include ONLY if you find a real deployed URL in README or config; otherwise omit. Do not guess.

Do not mention portfolio, registry, iframe, or YAML contract in the copy.

## Tone
Plain, direct, easy to understand. No buzzwords. A non-technical reader should get it in ~10 seconds.

## Output
- Show the drafted portfolio.yaml for review.
- Write the file to the repo root as portfolio.yaml.
- Do not modify README unless you add one optional line: "Visitor overview: see portfolio.yaml."

## Do not
- Invent features, metrics, or URLs
- Copy install/env instructions from README into description
- Add demo URL unless it exists today
````

## After adding yaml

1. Commit and push to the default branch (`main`).
2. In the portfolio repo, run `npm run fetch:projects` (or wait for the next Vercel deploy).
3. Ensure the repo is listed in the portfolio [`src/data/registry.ts`](../src/data/registry.ts).
