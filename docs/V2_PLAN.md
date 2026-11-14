# Portfolio v2 plan (branch `v2-simple`)

Written 13 Nov 2026. Goal: by Mon 16 Nov the site is **simple, fast, honest and consistent** with the CV and LinkedIn. It's built from one spine file (`content/profile.yaml`) plus local Markdown files for the bio, the story and each project (§15; the per-repo `portfolio.yaml` was dropped on 14 Nov).

**Claude in this repo: read this whole file first. Before deleting anything, list exactly what you will delete and keep, and wait for Aryan's OK.**

**Vision (added 13 Nov, after design research): see §14.** It refines §5–§8; where they disagree, §14 wins.

**Content model (14 Nov): see §15.** Everything is local to this repo; it replaces the cross-repo fetch in §6, §10 and §14.

---

## 1. Principles

1. **5-second test.** A recruiter sees name, headline, what I build and a CV link without clicking, waiting or scrolling.
2. **One source of truth.** Every fact on the site comes from `content/profile.yaml` or a file under `content/` (§15). Nothing is hard-coded in components.
3. **Honest by default.** Only claim what a repo or the spine can prove. Status stamps carry a date. Unverified = `TODO`, never guessed.
4. **One creative signature, added last.** Everything works without it.
5. **Fast.** Readable with JavaScript off. Motion turns off for people who've asked their device to reduce it. Loads in under 2 seconds on a phone.

---

## 2. Facts locked today (use these exact strings everywhere)

| Item | Value |
| --- | --- |
| Headline | Full-stack developer building careful, tested tools, often with AI, with a research background |
| Short headline | Junior Software Developer · TypeScript, React, Python · Auckland |
| 9horsemen | Full Stack Developer (volunteer), 9horsemen (early-stage startup), Oct 2026 – present. Live: 9horsemen.com, gallop.9horsemen.com |
| Specialist Support | SEO Specialist (part-time), Jul 2025 – Jul 2026 |
| KRIL Digital | Junior Website Developer, May 2024 – Oct 2024 |
| Koverify | Full Stack Developer, Aug 2023 – Dec 2023 |
| Master's | Master of Applied Technology (Computing), Unitec, Feb 2025 – Jul 2026, GPA 7.667 / 9.0 |
| GSTF | Master's thesis (A-); **paper in preparation**. Never "under review at MVA": that submission is closed. Code and manuscript stay private. |
| Work rights | Post Study Work Visa to Aug 2029, no sponsorship required |
| Referees | Available on request |

---

## 3. Remove

**Components (`src/components/`):** `motion/*`, `VoidChrome.tsx`, `void-chrome-nav.tsx`, `void-window/*`, `VoidScrollDrama.tsx`, `AboutScrollDrama.tsx`, `ProjectExhibit.tsx`, `ProjectExhibitMotion.tsx`, `ExhibitSurfaceInvites.tsx`, `C4DiagramViewer.tsx`, `C4ArchitectureExplorer.tsx`, `ArchitectureGraphView.tsx`, `ArchitectureJourney.tsx`, `MermaidDiagram.tsx`, `ProjectDiagram.tsx`, `ProjectGallery.tsx`, `StackMarquee.tsx`, `FeaturedDemos.tsx`, `DemoPanel.tsx`

**Lib / data:** `src/lib/motion.ts`, `motion-tokens.ts`, `architecture-graph.ts`, `architecture-graph-layout.ts`, `architecture-walkthrough.ts`, `exhibit-case.ts`, `exhibit-case.test.ts`, `case-study-schema.ts`; `src/data/architecture-graphs/`, `base-diagram.ts`, `exhibits.ts` (contains a hard-coded fake ADA "Proof" transcript), `registry.ts` (demo links move into `portfolio.yaml`)

**Content / scripts:** `content/project-case-studies.json`, `content/experience.md` (**contains a wrong claim:** a Koverify "hotel line" app), `scripts/validate-architecture-graphs.ts`, `scripts/validate-case-studies.ts`

**Routes:** `src/app/(site)/workshop`, `src/app/(site)/about` and `src/app/(site)/projects` (both import deleted components; v2 puts About and Projects on the home page). The "Blog" nav link lives in `VoidChrome.tsx`, so it goes with it. Keep the blog code for project stories, served at `/projects/[slug]`.

**Dependencies:** `gsap`, `mermaid`, `three`, `@types/three` (checked 13 Nov: only deleted files import them), plus `pdf-parse` and `@types/pdf-parse` (§9 drops CV PDF parsing; the guide script is their only user).

**Other files:** delete `.tmp-mobile-audit/`, `src/lib/type-tokens.ts`, `docs/registry.md`, `docs/project-case-studies.md`. They stay in `main`'s history.

**Docs:** move the old design docs (`void-chrome-transitions.md`, `architecture-graph.md`, `streamline-project-docs.md`, `v2-roadmap.md`) plus `content/guide-context.md`, `content/knowledge-bank.md` and `docs/contract.md` into `docs/archive/`. Don't delete them.

**Knock-on edits:** `layout.tsx` (drop `VoidChrome`, `MotionScaffold`, the Rubik Dirt font), `SiteFooter.tsx` (drops `motion/HomeFooterChrome`), `PortfolioGuide.tsx` (drops `@/lib/motion`), `src/lib/projects.ts` (imports `registry`). `fetch-portfolio-yaml.ts` and `build-guide-context.ts` both import deleted files, so `prebuild` is emptied in step 1 and each script comes back when its step rewrites it. The guide keeps serving the committed `guide-context.json` until step 6.

---

## 4. Keep

- Next.js, React, Tailwind and TypeScript setup; `yaml`, `react-markdown`, `tsx`
- `scripts/fetch-portfolio-yaml.ts` → update it to the v2 contract
- AI chat: `src/app/api/guide/route.ts`, `src/components/PortfolioGuide.tsx`, `scripts/build-guide-context.ts`, `src/lib/guide-*.ts`. Restyle it, and point its context at the spine and the project files only.
- `src/lib/blog.ts`, `src/components/BlogMarkdown.tsx`, reused for project story pages
- `src/components/SiteFooter.tsx`, `public/resume.pdf`, `src/lib/mock-projects.ts` (for offline dev; update to v2)

---

## 5. The spine: `content/profile.yaml` (draft, verify every line)

```yaml
name: Aryan Johari
headline: Junior Software Developer · TypeScript, React, Python · Auckland
tagline: Full-stack developer building careful, tested tools, often with AI, with a research background.
pitch: >
  I studied computer science in Mumbai and worked as a developer during and after my degree,
  building e-commerce sites and about 20 client websites. In Auckland I completed a Master's in
  Computing at Unitec, with a research thesis, while working part-time on three New Zealand
  websites. Now I build web apps in TypeScript and React with Python or AWS behind them, help
  build a live startup product, and write down honestly what works and what doesn't.
location: Auckland, New Zealand
work_rights: Post Study Work Visa to Aug 2029 (no sponsorship required)
links:
  email: johari.aryan16@gmail.com
  github: https://github.com/aryanjohari
  linkedin: https://www.linkedin.com/in/aryan-johari-627b4023a/
  cv: /cv
threads:
  - { id: web, name: Web products, stack: "TypeScript, React, Postgres" }
  - { id: ai, name: Safe AI tools, stack: "Python, FastAPI, AWS" }
  - { id: research, name: Research, stack: "PyTorch, experiments" }
experience:
  - role: Full Stack Developer (volunteer)
    org: 9horsemen
    org_note: early-stage startup
    dates: Oct 2026 – present
    highlights:
      - Built the admin app's AI assistant, with safeguards that strip contact and ID details and quote customer-entered text before it reaches the model.
      - Added social posting to the Expo admin app, including photo capture and a before-and-after composer.
      - Added a scheduled job that checks Google's index status for customers' published pages.
  - role: SEO Specialist (part-time)
    org: Specialist Support Services
    dates: Jul 2025 – Jul 2026
    highlights:
      - Looked after three New Zealand websites and explained search data in plain language so non-technical partners could decide what to fix first.
  - role: Junior Website Developer
    org: KRIL Digital
    org_note: digital marketing agency, Mumbai
    dates: May 2024 – Oct 2024
    highlights:
      - Took about 20 client websites (WordPress, React, Shopify) from brief to live site.
  - role: Full Stack Developer
    org: Koverify
    org_note: Mumbai
    dates: Aug 2023 – Dec 2023
    highlights:
      - Owned three in-house wholesale clothing websites and built Snug Stitch, a React, Express and MongoDB catalogue app.
education:
  - { degree: "Master of Applied Technology (Computing)", school: Unitec, dates: "Feb 2025 – Jul 2026", note: "GPA 7.667 / 9.0; thesis (A-), paper in preparation" }
  - { degree: "BSc Computer Science", school: Thakur College, Mumbai, dates: "Sep 2021 – Apr 2024", note: "CGPA 8.49 / 10" }
certifications:
  - AWS Certified Developer – Associate
referees: Available on request
```

---

## 6. Project contract v2 (`portfolio.yaml` in each repo, read from `main`)

> **Superseded on 14 Nov by §15.** The fields below still describe what a project needs, but they now live in `content/projects/<slug>.md` in this repo, not in each repo.

```yaml
title: Prism
summary: One plain sentence a recruiter understands   # ≤120 chars
thread: web | ai | research
tier: featured | in-progress | archive
order: 2                                             # position within its tier
status: { state: live | frozen | wip, as_of: 2026-11-14, note: "v1 finished; ideas continue in Phosphene" }
role: Solo                                           # or "Full stack developer, team of 2"
dates: Apr 2026 – Sep 2026
stack: [TypeScript, React, Vitest]                   # max 5
proves: Frontend craft and testing my own work       # the ONE thing this project proves
proof: ["103 tests", "Live demo", "CI"]              # verifiable facts only
face: docs/face.png                                  # 1200x630 screenshot or GIF
links: { demo: "...", github: "...", story: "..." }  # github optional when private
visibility: { code: public | private, can_show: "...", cannot_show: "..." }
story:                                               # 1–2 sentences each
  problem: ...
  built: ...
  decision: ...
  learned: ...
  next: ...
```

- Validate both schemas in `prebuild` with a small hand-written validator, in the style of the existing `src/lib/portfolio-schema.ts` (no `zod`, no new dependency). Tests use `node:test` through `tsx`.
- The list of repos to fetch moves from `src/data/registry.ts` to `content/projects.yaml` (repo or local slug per project). The build **fails** on a missing required field, a bad enum, or two featured projects with the same `proves`.
- Private projects (9horsemen, GSTF): the yaml lives in this repo under `content/projects/<slug>.yaml`, with a face image and no code link.
- Each project repo's CLAUDE.md gets a short "Portfolio contract" section: keep `portfolio.yaml` and the README top in sync with every status or feature change; claim only what the repo proves; no secrets or private data in the face image or demo.

| Project | tier | proves |
| --- | --- | --- |
| 9horsemen | featured | Team work on a live product (TypeScript stack) |
| Prism | featured | Frontend craft and testing my own work |
| PII Gateway | featured | Back-end APIs, honest about limits |
| ADA (v1) | featured | AI agents with safety built in |
| GSTF | featured | Research rigour |
| ADA v2 | in-progress | Where I'm heading: governed AI systems |
| Phosphene | in-progress | Creative engineering |
| Tahi Pulse, Sound Visualiser, social-upload | archive | n/a |

---

## 7. Pages and components

**Routes:** `/` (everything on one page) · `/projects/[slug]` (story page) · `/cv` (serves `resume.pdf`) · 404.

**Home, top to bottom:**
1. **Hero:** name, short headline, tagline, CV and contact links. A slot on the right for the art (empty until the final step).
2. **Ask note:** the AI chat as a small margin-note input with 3 suggested questions.
3. **Selected work:** featured projects as numbered entries (`01 — 9horsemen`): face image, summary, `proves`, status stamp, links.
4. **In progress:** ADA v2 and Phosphene, with a dated status line each.
5. **Experience:** from the spine.
6. **About:** the pitch, education, certification, work rights.
7. **Archive:** one line per project.
8. **Footer:** email, GitHub, LinkedIn.

**Components:** `Hero`, `AskNote`, `ProjectEntry`, `StatusStamp`, `ExperienceList`, `ArchiveList`, `StoryPage`, `SiteFooter`.

---

## 8. Design brief

**Direction: engraving print / lab notebook**, taken from Phosphene's own look.

- **Colour:** warm paper background, ink-black text, one accent from a Phosphene palette (phosphor green or vermilion). Dark mode = Phosphene's "phosphor" palette. Tokens in `src/styles/tokens.css`.
- **Type:** a serif with character for headings (e.g. Newsreader or Fraunces) and a monospace for labels: dates, stack, status (e.g. IBM Plex Mono). Body in the serif or a plain sans.
- **Layout:** single column, wide margins, like a printed catalogue. Numbered entries. Thin rules, no cards with shadows.
- **Images:** every project's face image is processed through Phosphene's engraving or stipple look, so they all match.
- **Status stamps:** small monospace labels such as `LIVE · 14 Nov 2026`, `FROZEN`, `IN PROGRESS`.
- **Motion:** lines draw in once; quiet reveals on hover. Nothing loops. Off for reduced-motion users.
- **Avoid:** dark gradients, purple/blue glows, frosted glass, bento grids, emoji, "Hi, I'm Aryan 👋", floating chat bubbles, one plain font everywhere, boot screens, scrambled text, anything that must load before the name shows.

---

## 9. AI chat rules

- Context = `profile.yaml` + all project yaml files + story pages. Nothing else (no PDF parsing of the CV).
- Every answer links to the project or section it came from. If it can't answer from the context, it says so.
- No API key or an error → the chat hides itself quietly. Never show an error.
- Rate-limit it and cap its length (the route already exists; keep its limits).

---

## 10. Build order (each step ends with a working build)

> Historical. §13 is the live order; steps 4 and 8 (fetch from repos, deploy hook) were dropped on 14 Nov (§15).

1. **Branch + clean-up.** Create `v2-simple`, run the deletions in §3, and remove the old prebuild steps. ✔ Build passes and shows a blank home page.
2. **Spine + schemas.** Add `content/profile.yaml` (§5), the schemas and the prebuild validation. ✔ A bad field fails the build.
3. **Home with no projects.** Hero, experience, about, footer from the spine, with the design tokens and fonts. ✔ 5-second test passes on a phone.
4. **First project: Prism.** Add the v2 `portfolio.yaml` in the Prism repo, update the fetch script, and build `ProjectEntry` and the `/projects/prism` story page. ✔ A change on Prism's `main` shows up after a rebuild.
5. **The rest, one at a time:** 9horsemen (local yaml), PII Gateway, ADA, GSTF (local yaml), then ADA v2, Phosphene and the archive.
6. **AI chat.** Restyle it as `AskNote` and switch its context (§9).
7. **Tracking.** Vercel analytics or GA4, Search Console domain property for arkhives.nz (or the new domain), and `?ref=` support.
8. **Optional:** a deploy hook so each project's push to `main` rebuilds the site.
9. **Last: the Phosphene hero art,** generated at build time from the spine and project data (thread = layer, featured project = line cluster, in-progress = unfinished strokes; seed from the data, so the picture only changes when the story changes).

---

## 11. Not in this branch

Blog posts and stories beyond what the project pages need, a "Now" page, a personality / creative section, the new domain, and anything that adds a dependency without a clear reason.

## 12. Open TODOs (Aryan)

Answered 13 Nov:
- 9horsemen: **volunteer**. Show the live sites, 9horsemen.com and gallop.9horsemen.com.
- Availability: **left off the site** (drop `availability` from the spine).
- Tahi Pulse: **solo developer in a team of 6–8**; the others worked on other jobs.

Still open:
- Referees: two non-family names lined up (the site only says "Available on request").
- Check every line of `profile.yaml` against the CV (about 20 client sites, dates, GPA, AWS cert). Needed before launch.
- Face images: is there a script for Phosphene's engraving look? If not, use plain screenshots in step 5 and add the look later.
- Tracking: Vercel analytics (new dependency) or GA4.

---

## 13. Phased implementation (agreed 13 Nov)

Every phase ends with `npm run build` and `npm run lint` passing (plus `npm test` once it exists). Life OS: children of ticket #25.

| Phase | Ticket | Where | Status / done when |
| --- | --- | --- | --- |
| P0 Paperwork | #308 | here | Done |
| P1 Clean-up | #309 | here | Done |
| P2 Spine + validator + tests | #310 | here | Done |
| P3 Home from the spine | #311 | here | Done (Lighthouse moved to the launch gate) |
| P4a Contract v2, fetch, entries, story page | #312 | here | Done |
| **S1** Home page: bio (Default/Long) + work list, content and UI together | #320 | here | Live on the branch in the layout Aryan picked, checked by him; phone number gone |
| **S1b** Story page (`/story`) | #329 | here | `/story` from `content/story.md` in the `mockups/story.html` layout, checked by Aryan |
| **S2** Prism story page: `content/projects/prism.md` + story + page layout; remove the fetch code | #321 | here | `/projects/prism` from the Markdown file, story edited and layout checked by Aryan |
| ~~P4b Prism repo `portfolio.yaml`~~ | #313 | — | Dropped 14 Nov (§15) |
| **S3** Other project pages, one at a time | #314 | here | Every page live and checked by Aryan |
| **S4** (optional) Job notes behind the bio links | #322 | here | Chosen jobs have a short page, or Aryan skips it |
| P6 Guide → `AskNote` | #315 | here | Context-builder tests pass; hidden with no key |
| P7 Tracking | #316 | here | `?ref=test` visit shows; Search Console verified |
| ~~P8 (optional) Deploy hook~~ | #317 | — | Dropped 14 Nov (§15) |
| P9 Phosphene art | #318 | here | Same data gives the same art; works with JS off (may move earlier if the mockup uses it) |
| Launch gate | #319 | here | CV check, no `TODO` in production, Lighthouse under 2 s, 5-second test on a real phone, merged |

Order: S1 → S1b → S2 → S3 → S4 → P6 → P7 → P9 → launch gate. **One page at a time:** each slice writes the content, mocks it, lets Aryan pick, and builds it, so content and UI are decided together.

---

## 14. Vision (13 Nov, after design research)

**The site walks the reader through Aryan's story: what he has done, what he is doing, where he is heading.** Little UI, plain first-person prose, every link one step deeper into the path. A recruiter gets it in seconds; anyone who scrolls finds depth. Reference for the *mechanism*, not the look: leerob.com (a short bio whose links open his own write-ups, a dated list of work, one picture that tells where he is from).

- **Decided:** story-led, short and simple; text-first; nothing generated by AI at build time; content reviewed by Aryan; site first, then essays (blog code kept), then networking.
- **Not decided (options for the S1 mockup, #320):** two columns with a picture column (e.g. Mumbai and Auckland as a Phosphene engraving); a Default/Long bio (must work with JS off); "proves" with proof and limits beside each project; dated status; a link to the v1 void site.
- ~~**Schema split:** facts in each project repo, curation and story here.~~ Dropped 14 Nov: everything is local (§15).
- **Later, not for launch:** essays (Writing section hidden while empty), a Lee-style Notes section of topic pages (#325), networking (#324), the interdisciplinary angle (#323).
- **Privacy:** everything committed here is public. Raw notes and evidence stay out of the repo (`~/CV` or a gitignored `notes/`).

---

## 15. Content model: local only (14 Nov)

**Decided 14 Nov: no auto-update from project repos.** Most projects are frozen, and editing one file here takes a minute. Fetching needed a `portfolio.yaml` in every repo, branches and merges across repos, and a deploy hook: many moving parts to save that minute.

- **`content/profile.yaml`:** facts about Aryan (links, jobs, education). Gains the home-page fields in S1: per-job `taught` line and a way to hide a job (9horsemen, on hold), plus the epigraphs.
- **`content/home.md`** (short bio) and **`content/story.md`** (the long story): plain Markdown, rendered with `react-markdown`.
- **`content/projects/<slug>.md`:** one file per project. Frontmatter = facts (`title`, `summary`, `tier`, `order`, `dates`, `role`, `stack`, `status` + `as_of`, `proof`, `links`, `face` for the picture). Body = the story as `## ` sections (problem, what I built, key decision and its cost, what I learned, what it can't do, next). Frontmatter is parsed with the existing `yaml` package (no new dependency) and validated in prebuild: a missing field or bad value fails the build.
- **Removed:** `scripts/fetch-projects.ts`, `src/lib/fetch-project.ts` and its tests, and `content/projects.yaml` (order moves into each file). Deleted in S2 when Prism moves to Markdown, after listing them for Aryan's OK. P4b and P8 are dropped.
- **Privacy:** only finished, checked text is committed. Drafts stay in the gitignored `drafts/`; phone numbers, client details and raw notes never go in.
- **Guards (C4):** prebuild fails on anything that looks like a phone number, in every build. Text Aryan hasn't edited starts with `TODO`: a warning locally and in previews, an error in the production deploy (`VERCEL_ENV=production`).
- **AI guide context:** generated at build time from `content/` only (`scripts/build-guide-context.ts`, gitignored output), so it holds nothing the site doesn't publish.
- **Layout:** `mockups/` (home-editorial, project, story) is the north star. Layout changes go there first, then into the site.
