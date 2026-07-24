# UI Specification

## Design tokens

All tokens live as CSS custom properties in `src/app/globals.css`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0a0a0a` | Page / void background |
| `--color-text` | `#f2f0eb` | Primary text (cream/off-white) |
| `--color-border` | `rgba(242, 240, 235, 0.16)` | Soft light borders, table rules |
| `--color-muted` | `#9a9690` | Secondary text, placeholders |
| `--color-accent-band` | `#161616` | Header accent background |
| `--space-1` | `8px` | Base grid unit |
| `--space-2` | `16px` | Standard padding |
| `--space-3` | `24px` | Section gaps |
| `--space-4` | `32px` | Page margins |
| `--font-mono` | IBM Plex Mono | Only font family used |
| `--motion-fast` | `0.2s` | CSS mirror of `MOTION.fast` |
| `--motion-medium` | `0.45s` | CSS mirror of `MOTION.medium` |
| `--motion-slow` | `0.6s` | CSS mirror of `MOTION.slow` |

## Motion language

Shared timing lives in `src/lib/motion-tokens.ts` (re-exported from `src/lib/motion.ts`). Use these for new UI animation — not one-off magic numbers.

| Token | Value | Class of motion |
|-------|-------|-----------------|
| `MOTION.fast` | `0.2` s | Hovers, presses, small UI |
| `MOTION.medium` | `0.45` s | Fades, panels, most enters |
| `MOTION.slow` | `0.6` s | Larger section / page-ish moves |
| `MOTION.chrome.morph` | `0.9` s | Home ↔ site void-chrome measure→tween (both directions) |
| `MOTION.chrome.content` | `0.5` s | Page fade before (→home) / after (←home) morph |
| `MOTION.ease` | `power2.out` | Default GSAP ease |
| `MOTION.easeInOut` | `power2.inOut` | Symmetric GSAP ease |
| `MOTION.chrome.ease` | `power2.inOut` | Chrome morph ease (mirrored) |

Helpers: `motionDuration("fast" \| "medium" \| "slow")`, `motionDurationCss(...)` for `"0.45s"`-style strings. CSS transitions should use `--motion-*` so changing a pace stays consistent.

**Exceptions (cinematic — do not shorten to medium):**

- `MOTION.chrome` — home ↔ site void-chrome morph (~0.9s measure→tween, mirrored both ways)
- `MOTION.scramble` — home name scramble (~2.15s)
- `MOTION.boot` — boot theatre clock (type/hold/wipe/exit fade, etc.)

**Reduced motion:** Tokens do not override a11y. Keep gating with `prefersReducedMotion()` — skip the tween or use zero duration as components already do.

**Rule:** New animations must use `MOTION` tokens (or the matching CSS `--motion-*` vars). No Framer Motion. Chrome morph lives in `VoidChrome` — do not add competing full-page transition systems.

## Typography

- **Single family:** IBM Plex Mono via `next/font/google`
- **No display fonts, no sans-serif fallbacks in the shell**
- **Sizes:** 14px body, 12px table/meta, 18–24px page titles
- **Weight:** 400 regular, 600 for headings and nav emphasis

## Visual rules

- Flat surfaces only — no box-shadow, no backdrop-blur, no gradients except header accent and workshop card visual placeholders (slug-hashed void panes)
- 1px solid borders using `--color-border`
- **No scroll hijacking of the whole site, no smooth-scroll libraries.** Chrome morph (home ↔ site) is the intentional route transition; do not add full-page takeover transitions.
- Texture/grain/scanline **only** on the site header accent band
- Links: underline on hover, no colour change

## Enhanced motion (theatre + desktop extras)

Two gates in `src/lib/motion.ts` (both server-safe → `false`). Shared paces/eases: see **Motion language** above (`src/lib/motion-tokens.ts`).

| Gate | When | Used for |
|------|------|----------|
| `canUseTheatreMotion()` | **not** `prefers-reduced-motion: reduce` (any viewport / pointer) | Boot theatre, Atmosphere trail, boot-cover visibility |
| `canUseEnhancedMotion()` | `min-width: 1024px` + `pointer: fine` + not reduced-motion | Gallery mild `rotateY`, dense particle budgets |

- **Atmosphere** (`src/components/motion/Atmosphere.tsx`) — site-wide fixed full-viewport canvas behind `.site-shell` (`pointer-events: none`, `z-index: 0`). Near-black clear `#0a0a0a`; soft red↔blue pointer/touch trail (desktop pool 200, mobile/light ~90; DPR ≤1.5, `low-power`). Idle until `portfolio:boot-done`; weaker spawn near `.void-chrome--home .portfolio-guide-float` when present (home ask bar); pause/dispose on unmount and `document.hidden`. Touch drives the trail via `pointermove`. `.site-shell` is transparent so the void shows through on all routes.
- **Boot cover:** SSR `#boot-cover` (`#0a0a0a`, above `.site-shell`) prevents any pre-hydrate flash before client BootOverlay. A `beforeInteractive` script sets `data-boot-cover-skip` on `<html>` **only when reduced-motion** so CSS hides the cover without removing the node (avoids hydration mismatch); BootOverlay calls `removeBootCover()` after mount. Three/GSAP stay client-only and are not required for the dark cover.
- **BootOverlay** (`src/components/motion/BootOverlay.tsx`) — dark boot theatre (~8s) on phone, tablet, and desktop (unless reduced-motion), then unmounts so guide input is never blocked.
  - **Colours (boot-local):** near-black background `#0a0a0a`, cream text `#f4f0e8`.
  - **Shared clock:** one GSAP timeline drives story progress `p` 0→1 over ~7.4s content; BootField reads `p` every RAF via `getProgress` and its own elapsed `t` (Three Clock). Flow/silk uses `t`; density/converge/settle use `p`; hue drifts with `t` and calms as `p→1`.
  - **Beats:** (1) `it's craft, not code.` (2) `made with intention, not scripts.` (3) `hi — i'm aryan.` Typing locked to the same ~8s timeline.
  - **Field (simple arc):** void roam only (`p` 0–0.4) → all agents gather on **one center frame** around the typed line (`p` 0.4–0.75) → that frame morphs to measured `.portfolio-guide-float` (`p` 0.75–1) → lines-only settle. Perimeter is a **rounded rect / pill** from computed `border-radius` (same outline as the ask bar). No header/footer rail redirects. Typed line is pinned to the ask-bar center; measure ask (+ padded `[data-boot-line]`); single centered-bar fallback if needed. Soft exit: hold aligned frame ~0.4s, then longer overlay fade onto the same void + ask home. Skip stays fast. Depth while roaming; circular nodes while moving.
  - **Perf:** Desktop enhanced: 160 agents, trail 24, DPR ≤2. Mobile / coarse / narrow (not enhanced): ~80 agents, trail 14, DPR ≤1.5. Always `powerPreference: "low-power"`; pause when `document.hidden`; dispose on unmount.
  - **Skip:** tap/click anywhere or Escape; short fade then unmount. Hint: “tap to enter” on coarse pointer, “click to enter” otherwise.
  - **Reduced-motion:** no boot theatre, no Atmosphere — site shows immediately. Boot always ends with `signalBootDone()` (`data-boot-done` + `portfolio:boot-done`) so home presence (name scramble, section-link reveal) can sync.
- Wired once via `MotionScaffold` in root `layout.tsx` (`dynamic(..., { ssr: false })`). Do not import three/gsap outside client motion modules and page-local clients that already use GSAP (`ProjectGallery`). No Framer Motion.
- **About anchors** (`AboutAnchorNav`) — sticky section menu with scroll-spy active state + staggered entrance; soft `h2` fade on enter. No pin/scrub. Static when `prefers-reduced-motion`.

## Header accent texture

Applied via `.site-header-accent` / `.void-chrome-accent` on `VoidChrome`. Accent band stays **hidden** (opacity 0) in both home and site void chrome — scanline texture is reserved if a denser chrome mode returns later.

## Void chrome (home ↔ site)

Single persistent client shell: `VoidChrome` in root `layout.tsx` (`html[data-void-chrome="home|site"]`).

| Mode | Layout |
|------|--------|
| `home` (`/`) | Hero name (scramble once after boot) · centered ask + invite + reply · glyph rail/row (workshop · about · resume) |
| `site` (all other routes) | Compact bar: smaller name · `home · workshop · about · resume` · mini ask top-right |

**Morph (morph-first):** Chrome nav intercepts in-app clicks. Home ↔ site: measure→tween name/nav/ask (`MOTION.chrome.morph`), **then** `router.push`, then soft content fade. Site ↔ site: push + content fade only. See `docs/void-chrome-transitions.md` for why post-route opacity tricks were abandoned. Narrow/coarse: matched crossfade. `prefers-reduced-motion`: instant mode + push.

**Mini ask:** Compact wireframe input; replies open in a non-layout-breaking panel (dropdown under the bar; fixed bottom sheet on small screens). Remounts cleanly on site navigations via `remountKey`.

Boot → home theatre is unchanged (`BootOverlay` / ask-bar measure).

## Wireframes

### Link map

| Link | URL | Page |
|------|-----|------|
| Nav `home` | `/` | Minimal void: identity + ask + footer |
| Nav `workshop` | `/workshop` | Coverflow project gallery (drag / arrows / dots) |
| Nav `about` | `/about` | Void blog read: philosophy, background, education, availability |
| Nav `resume` | `/resume.pdf` | PDF download |

Do **not** link to `/index` anywhere — it aliases to `/` on some hosts. `/index` redirects to `/workshop` for old bookmarks only.

### Home (`/`) — Ask Aryan void

Minimal black void (`#0a0a0a`) site-wide via `:root` tokens. Home and all site routes share quiet void chrome (no accent band / bottom rule). Composition lives in `VoidChrome` (route page body is empty).

Editorial composition (desktop): oversized name top-left · centered ask + invite whisper + reply · right-rail section links · contacts footer.

- **Header (home):** hero-scale soft GSAP scramble of `aryan johari` (`MOTION.scramble` ~2.15s, `clamp(2.35rem, 8.75vw, 5.5rem)`) once after boot on a full load (initial paint is dots only — no final-name flash). Return-to-home settles without re-scramble. **No under-name role/tagline.** `prefers-reduced-motion`: final name immediately. Accessible via `aria-label` on the name link (`HomeIdentity`).
- **Center:** void wireframe ask bar (larger type/padding) with a soft invite whisper under the bar (`ask me anything about my work` — DOM type-once + `MOTION.medium` fade after boot; full text instantly if reduced-motion; one-line reserved height so the bar does not jump) and a **reserved reply slot** below. Placeholder: `ask about my work, availability, or projects…`. Loading dots → character typewriter (~32 cps, capped ~3s); links become interactive when typing finishes. `prefers-reduced-motion`: full reply, no typewriter. No intro essay, no chip rails, no canvas quotes. Ask bar stays wireframe — no float/tilt chrome. Manual ask only (no auto Gemini).
- **Section links:** workshop · about · resume — clear text labels with larger glyph marks (18px) + ~1rem labels; underline on hover/focus. **Desktop (≥1024px):** fixed vertical stack in the right margin, out of the center cluster. **Mobile / tablet:** horizontal row under the ask stage (collapsed until reveal so the input stays centered). Auto-fades in ~0.9s after boot (`MOTION.medium` enter; immediate if reduced-motion); `inert` only until revealed. Leaving home morphs these into the site top nav (adds `home`).
- **Footer (home):** contacts only (`email · github · linkedin`) — always soft-visible (`HomeFooterChrome`). Light padding; no heavy separator.
- Ask bar: void fill (`#0a0a0a`), cream/off-white rounded outline, soft outer glow — reads as settled boot wireframe; off-white text + muted placeholder; ghost outline send. No GSAP float / no CSS 3D tilt. Mobile: same language, slightly tighter radius.

```
┌─────────────────────────────────────────────────────────────┐
│ aryan johari (hero-scale)              workshop             │
│                                        about                │
│                                        resume               │
│                                                             │
│           ┌─ void wireframe ask bar ────────────────┐      │
│           │ ask about my work, availability…  send │      │
│           └─────────────────────────────────────────┘      │
│           ask me anything about my work (whisper)           │
│           ┌─ reserved reply slot (scrolls) ─────────┐      │
│           │ loading → typed reply                   │      │
│           └─────────────────────────────────────────┘      │
│                                                             │
│  email · github · linkedin                                  │
└─────────────────────────────────────────────────────────────┘
```

**Boot → home morph:** void roam → one particle frame on `hi — i'm aryan.` → morph to measured `.portfolio-guide-float` bounds → soft hold + fade into the same void home (header + ask underneath; right-rail / under-ask links auto-fade shortly after boot). Boot signals `portfolio:boot-done` / `data-boot-done` for presence timing. Larger ask bar is picked up by live measure (no particle logic change).

**Void chrome CSS:** `.void-chrome`, `.void-chrome--home`, `.void-chrome--site`, `.void-chrome-name`, `.void-chrome-nav`, `.void-chrome-ask`, `.void-chrome-page`

**Home ask CSS classes:** `.portfolio-guide--home`, `.portfolio-guide-stage`, `.portfolio-guide-invite`, `.portfolio-guide-reply-slot`

**Home header identity:** `.site-header-identity` (`HomeIdentity`) — name only

**Home soft section links:** `.home-glyph-row`, `.glyph-link`, `.glyph-link-label` (owned by `VoidChrome`) — desktop right-rail; mobile under-ask row

**Home footer contacts:** `.site-footer-chrome--contacts` (`HomeFooterChrome`)

**FeaturedDemos CSS classes:** `.featured-demos`, `.featured-demo-row`, `.featured-demo-title`, `.featured-demo-summary`, `.featured-demo-action`

### Workshop (`/workshop`)

Immersive project gallery — no featured demos. Same void site chrome as other non-home routes (compact name + nav + mini ask). **Normal page scroll:** intro → self-contained gallery → footer (no pin scrub).

**Gallery (`ProjectGallery`):** center active card in a coverflow / revolving slot; left/right neighbors visible (scaled/dimmed). Change project via drag (GSAP **Draggable** + **InertiaPlugin** when motion allows), prev/next arrows, dots, and `02 / 05` index. Keyboard arrows when the gallery is focused. Enhanced motion (`canUseEnhancedMotion`) adds mild `rotateY`; otherwise scale/opacity only. `prefers-reduced-motion`: fade/swap between cards — no 3D, no throw inertia. Cards include a slug-hashed void visual pane (placeholder until real images), title, summary, stack · status, open project / try demo, yaml warning when needed. Title and primary CTAs link to `/projects/[slug]` — drag does not trap navigation.

```
┌─────────────────────────────────────────────────────────────┐
│ aryan johari (quiet)   home · workshop · about · …   [ask] │
│                                                             │
│  > workshop                                                 │
│  Selected projects… — browse the gallery…                   │
│  ←   drag or use arrows · 02 / 05 · · ● · ·   →             │
│           ┌──────────┐                                      │
│  (dim)    │ ACTIVE   │    (dim)     ← coverflow / drag      │
│           │ [visual] │                                      │
│           │ title    │                                      │
│           │ summary  │                                      │
│           │ stack·st │                                      │
│           │ open/demo│                                      │
│           └──────────┘                                      │
│                                                             │
│ footer (normal document flow)                               │
└─────────────────────────────────────────────────────────────┘
```

**Workshop CSS classes:** `.workshop-page`, `.workshop-intro`, `.workshop-lede`, `.project-gallery`, `.project-gallery-chrome`, `.project-gallery-stage`, `.project-gallery-deck`, `.project-gallery-card`, `.project-gallery-visual`

```
┌─────────────────────────────────────────────────────────────┐
│  exhibit                                    api sample      │
├─────────────────────────────────────────────────────────────┤
│  # PII Gateway — sample sanitize request                    │
│                                                             │
│  POST /sanitize HTTP/1.1                                    │
│  Host: localhost:8080                                       │
│  ...                                                        │
│  (scrollable monospace <pre>)                               │
└─────────────────────────────────────────────────────────────┘
```

Exhibit panels match iframe sandbox height. Body scrolls on mobile.

**PortfolioGuide CSS classes:** `.portfolio-guide`, `.portfolio-guide--home`, `.portfolio-guide--mini`, `.portfolio-guide-float-wrap`, `.portfolio-guide-float`, `.portfolio-guide-form`, `.portfolio-guide-label`, `.portfolio-guide-input-row`, `.portfolio-guide-input`, `.portfolio-guide-submit`, `.portfolio-guide-invite`, `.portfolio-guide-response`, `.portfolio-guide-response--loading`, `.portfolio-guide-mini-panel`

### Project page (`/projects/[slug]`)

Single-column **exhibit** inside the wider project shell (`max-width: 1400px`). Story text stays ~72ch; diagram/stage can stretch wider. Shares the same void site chrome (mini ask included).

```
┌──────────────────────────────────────────────────────────────┐
│ name · nav · mini ask                                        │
├──────────────────────────────────────────────────────────────┤
│  live demo | exhibit | research                              │
│  Title                                                       │
│  One exhibit sentence…                                       │
│                                                              │
│  [Open live demo ↗]  GitHub  Docs  ← Back to workshop        │
│                                                              │
│  (Stage — exhibit DemoPanel only; live demos are CTA-first)  │
│                                                              │
│  Story                                                       │
│  Full description…                                           │
│                                                              │
│  How it works                                                │
│  ┌ diagram (base SVG or GitHub mermaid) ──────────────────┐  │
│  │  Input → Core → Output (+ Config / Storage)            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Details — status, stack, secondary links                    │
├──────────────────────────────────────────────────────────────┤
│ footer                                                       │
└──────────────────────────────────────────────────────────────┘
```

**Live / iframe:** primary action is **Open live demo ↗** (new tab). No full-page iframe hero on the slug page. Workshop cards stay the short hook; this page is the deeper exhibit.

**Exhibit registry demos:** Stage still renders `DemoPanel` with static sample content.

**Diagram:** Every slug shows How it works. Build-time fetch stores GitHub Mermaid when found; otherwise the void base flowchart. Scroll-draw via GSAP StrokeDashoffset + ScrollTrigger; `prefers-reduced-motion` shows the full diagram.

### About (`/about`) — void blog read

Hire / who-why page — **clear blog-style read**, not a guided dossier, not a second gallery. Quiet void site chrome (same mini ask as workshop). Atmosphere trail may show behind (`pointer-events: none`).

**Layout**
1. **Intro** — `> about` + short lede.
2. **Anchor menu** — sticky section nav (01–04) with scroll-spy highlight + entrance stagger; desktop side rail, mobile sticky top strip.
3. **Sections** — philosophy → background → education → availability; wider measure (~78ch), clear `h2` hierarchy, generous spacing; philosophy pull-quote; soft heading fade on scroll enter (static under reduced-motion). Hire details live in the availability section, not a top badge.
4. **Footer** — resume CTA + ask/workshop links.

```
┌─────────────────────────────────────────────────────────────┐
│ aryan johari (quiet)   home · workshop · about · …   [ask] │
├─────────────────────────────────────────────────────────────┤
│  > about                                                    │
│  01 philosophy  │  philosophy                               │
│  02 background  │  “I think in systems…”                    │
│  03 education   │  background / education / availability    │
│  04 availability│  [download resume.pdf]                    │
└─────────────────────────────────────────────────────────────┘
```

Facts stay aligned with resume / guide context (GSTF held-out FaceForensics++ **86.5%**). No coverflow, no boot replay, no seal/chapter gates.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `MotionScaffold` | `src/components/motion/MotionScaffold.tsx` | Client-only Atmosphere + BootOverlay |
| `Atmosphere` | `src/components/motion/Atmosphere.tsx` | Site-wide void + soft pointer/touch trail (post-boot; light budget on mobile) |
| `BootOverlay` | `src/components/motion/BootOverlay.tsx` | Cross-device dark boot theatre (typed lines + shared p; skips only reduced-motion) |
| `BootField` | `src/components/motion/BootField.ts` | Void roam → one center frame → ask-bar morph |
| `HomeIdentity` | `src/components/motion/HomeIdentity.tsx` | Home soft-scramble hero name (once per load; no under-name role) |
| `HomeFooterChrome` | `src/components/motion/HomeFooterChrome.tsx` | Home contacts only (always visible) |
| `AboutAnchorNav` | `src/components/AboutAnchorNav.tsx` | About sticky section anchors + scroll-spy + heading fades |
| `VoidChrome` | `src/components/VoidChrome.tsx` | Persistent home/site void chrome; morph-first nav then `router.push` |
| `SiteFooter` | `src/components/SiteFooter.tsx` | Contacts; home uses HomeFooterChrome |
| `FeaturedDemos` | `src/components/FeaturedDemos.tsx` | Featured projects with wired demos |
| `PortfolioGuide` | `src/components/PortfolioGuide.tsx` | Home ask + invite/reply; mini ask + panel on site chrome |
| `ProjectGallery` | `src/components/ProjectGallery.tsx` | Workshop coverflow gallery (Draggable + InertiaPlugin; no page pin) |
| `ProjectExhibit` | `src/components/ProjectExhibit.tsx` | Project exhibit: hero, CTAs, stage, story, details |
| `ProjectDiagram` | `src/components/ProjectDiagram.tsx` | How it works — base SVG or Mermaid + scroll-draw |
| `DemoPanel` | `src/components/DemoPanel.tsx` | Exhibit sandbox (and unused iframe helper) |

## Responsive rules

| Breakpoint | Behaviour |
|------------|-----------|
| `< md` (768px) | Exhibit stacks naturally; diagram scrolls horizontally if needed; workshop coverflow uses touch drag (no page pin); ask send ≥44px; gallery cards sized with `%` not `100vw`; void chrome morph uses crossfade |
| `≥ md` | Index/about: 960px max-width. Project pages: 1400px shell, readable exhibit column; Flip morph home ↔ site |
| All | Shell / header / footer respect `env(safe-area-inset-*)`; no horizontal page overflow (`overflow-x: clip`) |

## Demo panel states

Used on project pages for **registry exhibit** demos (and still available for iframe elsewhere). Live projects on `/projects/[slug]` prefer **Open live demo ↗** instead of embedding.

1. **Not wired** — dashed border, muted text: "Demo not wired"
2. **Iframe (live)** — header row (`sandbox` + open in new tab), embedded iframe. Loading overlay; fallback if embed blocked or load times out (~8s). On mobile, prominent **open in new tab** link above iframe. **Slug pages do not use this as the hero** — CTA-first.
3. **Exhibit (static)** — header row (`exhibit` + variant label), scrollable `<pre>` body with monospace sample content. Shown in the exhibit Stage section. Variants: `api-sample` (PII Gateway), `terminal-log` (ADA), `metrics` (GSTF). Content in `src/data/exhibits.ts`.
4. **Wired, not implemented** (`api`, `edge`) — solid border, shows demo type label + "Coming soon"

## Changing design decisions

Edit tokens in `src/app/globals.css`. Update this document when adding new tokens or components so docs stay the single source of truth.
