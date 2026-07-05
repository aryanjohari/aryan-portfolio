# v2 Workshop Roadmap

Evolution from v1 (terminal index only) to a live workshop with narrative homepage and guide interaction.

## Phase A — Homepage narrative + layout polish (done)

- `HomeIntro` — name, role, narrative, stats, resume/about links
- `FeaturedDemos` — projects with wired demos from registry
- Full `ProjectTable` workshop index (moved to `/workshop` in Phase B)
- Docs: `MASTER.md`, `ui.md`, placeholder `content/guide-context.md`
- No new dependencies, no API routes, no guide component

### Success criteria

- [x] `npm run build` passes
- [x] Homepage narrative + featured demos + workshop index (pre–route split)
- [x] `/projects/background-studio` and iframe demos unchanged
- [x] `/about` still works
- [x] Visual: off-white, monospace, flat — no shadows, no new fonts, no WebGL on shell
- [x] Mobile: intro stats and featured rows stack cleanly

## Phase B — Portfolio guide (in progress)

- Route split: `/` = guide home, `/workshop` = project table only
- `scripts/build-guide-context.ts` — aggregate guide context at build time
- `content/guide-context.md` wired into `guide-context.json`
- `/api/guide` — Gemini proxy (server-side only)
- `PortfolioGuide` component — input, chips, reply panel
- `GEMINI_API_KEY` env var (local + Vercel)

### Success criteria

- [x] `npm run build` passes
- [x] `/` shows slim intro + guide only (no table, no featured list)
- [x] `/workshop` shows full project table only (5 projects)
- [x] Nav: home · workshop · about · resume
- [ ] Guide answers demos, GSTF, Auckland availability from context (requires `GEMINI_API_KEY`)
- [x] `/projects/background-studio` iframe unchanged (route untouched)
- [x] No API key in client bundle

## Phase B.1 — Guide context harness (done)

Resume and structured experience/education/skills ingested at build time; API prompt harness uses compact context with token budgets.

### Done criteria

- [x] `guide-context.json` has non-empty `resumeText`
- [x] `experience` array includes SEO Specialist + KRIL Digital (or resumeText covers them)
- [x] `meta.contextCharCount` logged at build
- [x] Guide answers work-experience questions without false "no information" declines
- [x] Out-of-scope questions get polite redirect, not portfolio-materials decline

## Phase C — Remaining demos (later)

- ADA edge demo proxy
- Demos for `pii-gateway`, `gstf`, and other unwired registry entries
