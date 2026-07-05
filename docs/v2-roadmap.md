# v2 Workshop Roadmap

Evolution from v1 (terminal index only) to a live workshop with narrative homepage and optional guide interaction.

## Phase A — Homepage narrative + layout polish (this pass)

- `HomeIntro` — name, role, narrative, stats, resume/about links
- `FeaturedDemos` — projects with wired demos from registry
- Full `ProjectTable` workshop index unchanged below the fold
- Docs: `MASTER.md`, `ui.md`, placeholder `content/guide-context.md`
- No new dependencies, no API routes, no guide component

### Success criteria

- [ ] `npm run build` passes
- [ ] `/` shows: intro → featured demos (2) → workshop index table (5 projects)
- [ ] `/projects/background-studio` and iframe demos unchanged
- [ ] `/about` still works
- [ ] Visual: off-white, monospace, flat — no shadows, no new fonts, no WebGL on shell
- [ ] Mobile: intro stats and featured rows stack cleanly

## Phase B — Portfolio guide (later)

- `scripts/build-guide-context.ts` — aggregate guide context at build time
- `content/guide-context.md` wired into build output
- `/api/guide` — Gemini proxy (server-side only)
- `PortfolioGuide` component — chat UI in shell
- `GEMINI_API_KEY` env var (Vercel)

## Phase C — Remaining demos (later)

- ADA edge demo proxy
- Demos for `pii-gateway`, `gstf`, and other unwired registry entries
