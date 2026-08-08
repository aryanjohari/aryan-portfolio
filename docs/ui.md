# UI Specification

## Design tokens

Ink + type tokens are defined in `src/lib/type-tokens.ts` (`TYPE`, `INK`) and mirrored as CSS custom properties in `src/app/globals.css`. Motion paces stay in `src/lib/motion-tokens.ts`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0a0a0a` | Page / void background |
| `--color-text` | `#f4f0e8` | Primary text (cream/off-white) |
| `--color-border` | `rgba(244, 240, 232, 0.22)` | Soft light borders, table rules |
| `--color-muted` | `#c4bfb6` | Secondary text, placeholders |
| `--color-faint` | `rgba(244, 240, 232, 0.72)` | Soft secondary (idle, separators) |
| `--color-accent-band` | `#161616` | Header accent background |
| `--space-1` | `8px` | Base grid unit |
| `--space-2` | `16px` | Standard padding |
| `--space-3` | `24px` | Section gaps |
| `--space-4` | `32px` | Page margins |
| `--font-mono` | IBM Plex Mono | Only font family used |
| `--type-body` | `1rem` | Body / primary copy |
| `--type-meta` | `0.875rem` | Chrome, meta, secondary |
| `--type-caption` | `0.8125rem` | Smallest allowed site type |
| `--type-heading` | `1.125rem` | Quiet page headings (`> about`) |
| `--type-title` | `clamp(1.5rem, 3vw, 2rem)` | Emphasized section titles |
| `--type-display` | `clamp(2.35rem, 8.75vw, 5.5rem)` | Home identity |
| `--motion-fast` | `0.2s` | CSS mirror of `MOTION.fast` |
| `--motion-medium` | `0.45s` | CSS mirror of `MOTION.medium` |
| `--motion-slow` | `0.6s` | CSS mirror of `MOTION.slow` |

**Architecture diagram exception:** Do not restyle `.project-diagram*`, `.arch-*`, `.c4-*`, `.dg-*`, or Mermaid SVG labels with these type/ink tokens — those surfaces keep their own scale.

## Motion language

Shared timing lives in `src/lib/motion-tokens.ts` (re-exported from `src/lib/motion.ts`). Use these for new UI animation — not one-off magic numbers.

| Token | Value | Class of motion |
|-------|-------|-----------------|
| `MOTION.fast` | `0.2` s | Hovers, presses, small UI |
| `MOTION.medium` | `0.45` s | Fades, panels, most enters |
| `MOTION.slow` | `0.6` s | Larger section / page-ish moves |
| `MOTION.chrome.morph` | `0.9` s | Home ↔ site void-chrome measure→tween (both directions) |
| `MOTION.chrome.content` | `0.5` s | Page fade before (→home) / after (←home) morph |
| `MOTION.chrome.pageExit` | `0.28` s | Site ↔ site content exit (opacity + slight y) before push |
| `MOTION.chrome.pageEnter` | `0.4` s | Site ↔ site content entry after pathname settle |
| `MOTION.ease` | `power2.out` | Default GSAP ease |
| `MOTION.easeInOut` | `power2.inOut` | Symmetric GSAP ease |
| `MOTION.chrome.ease` | `power2.inOut` | Chrome morph ease (mirrored) |
| `MOTION.workshop.*` | spacing / z / angle / snap / drag / edge-glow layers | Workshop Three.js edge-glow tablet carousel |

Helpers: `motionDuration("fast" \| "medium" \| "slow")`, `motionDurationCss(...)` for `"0.45s"`-style strings. CSS transitions should use `--motion-*` so changing a pace stays consistent.

**Exceptions (cinematic — do not shorten to medium):**

- `MOTION.chrome` — home ↔ site void-chrome morph (~0.9s measure→tween, mirrored both ways)
- `MOTION.scramble` — home name scramble (~2.15s)
- `MOTION.boot` — boot theatre clock (type/hold/wipe/exit fade, etc.)
- `MOTION.workshop` — not cinematic; 3D carousel spacing / depth / snap / drag / hover tilt for `ProjectGallery` (paces still use `fast` / `medium`)

**Reduced motion:** Tokens do not override a11y. Keep gating with `prefersReducedMotion()` — skip the tween or use zero duration as components already do.

**Rule:** New animations must use `MOTION` tokens (or the matching CSS `--motion-*` vars). No Framer Motion. Chrome morph lives in `VoidChrome` — do not add competing full-page transition systems.

## Typography

- **Single family:** IBM Plex Mono via `next/font/google`
- **No display fonts, no sans-serif fallbacks in the shell**
- **Root:** 17px (`TYPE.rootPx`) — rem scale baseline
- **Scale:** `--type-body` / `--type-meta` / `--type-caption` / `--type-heading` / `--type-title` / `--type-display` (see Design tokens). Do not ship site UI below `--type-caption`.
- **Ink:** `--color-text` primary, `--color-muted` secondary, `--color-faint` soft secondary — avoid one-off low-opacity cream rgba for copy
- **Weight:** 400 regular, 600 for headings and nav emphasis
- **Exception:** Architecture diagram surfaces keep their own label sizes/colours

## Visual rules

- Flat surfaces only — no box-shadow, no backdrop-blur, no gradients except header accent and workshop project visual placeholders (slug-hashed void panes, on fallback cards and inside WebGL tablet content). Workshop **WebGL** projects are quiet **edge-glow tablets** — cream type on alpha framed by a light-drawn beveled rim; plates are near-transparent at center and bloom only at silhouette (Fresnel). No tinted glass fill, no colour splash, **no `transmission`**, no ice-shard spectacle, no glowing monograms.
- 1px solid borders using `--color-border`
- **No scroll hijacking of the whole site, no smooth-scroll libraries, no workshop page pin.** Workshop carousel is drag/swipe (+ arrows / dots / keyboard) inside its own canvas stage; the footer stays in normal document flow below. Chrome morph (home ↔ site) remains the intentional route transition; do not add full-page takeover transitions.
- Texture/grain/scanline **only** on the site header accent band and workshop fallback cards (same family as header accent); WebGL tablet content planes are clean cream typography on pure alpha, sealed between glass layers
- Links: underline on hover, no colour change

## Enhanced motion (theatre + desktop extras)

Two gates in `src/lib/motion.ts` (both server-safe → `false`). Shared paces/eases: see **Motion language** above (`src/lib/motion-tokens.ts`).

| Gate | When | Used for |
|------|------|----------|
| `canUseTheatreMotion()` | **not** `prefers-reduced-motion: reduce` (any viewport / pointer) | Boot theatre, Atmosphere trail, boot-cover visibility |
| `canUseEnhancedMotion()` | `min-width: 1024px` + `pointer: fine` + not reduced-motion | Workshop slab bevel/DPR budget + hover tilt (`MOTION.workshop`), dense particle budgets |

- **Atmosphere** (`src/components/motion/Atmosphere.tsx`) — site-wide fixed full-viewport canvas behind `.site-shell` (`pointer-events: none`, `z-index: 0`). Near-black clear `#0a0a0a`; soft red↔blue pointer/touch trail (desktop pool 200, mobile/light ~90; DPR ≤1.5, `low-power`). Idle until `portfolio:boot-done`; weaker spawn near `.void-chrome--home .portfolio-guide-float` when present (home ask bar); pause/dispose on unmount and `document.hidden`. Touch drives the trail via `pointermove`. `.site-shell` is transparent so the void shows through on all routes.
- **Boot cover:** SSR `#boot-cover` (`#0a0a0a`, above `.site-shell`) prevents any pre-hydrate flash before client BootOverlay. A `beforeInteractive` script sets `data-boot-cover-skip` on `<html>` **only when reduced-motion** so CSS hides the cover without removing the node (avoids hydration mismatch); BootOverlay calls `removeBootCover()` after its route-specific layer mounts. Three/GSAP stay client-only and are not required for the dark cover.
- **BootOverlay** (`src/components/motion/BootOverlay.tsx`) — route-gated with `usePathname()`. A direct load of `/` gets the existing dark boot theatre (~8s) on phone, tablet, and desktop. Direct loads of every non-home route get only a viewport-bound near-black “void wake”: a centered thin line and `MOTION.medium` (0.45s) fade into the already-rendered site. The wake has no particles, typing, ask measurement, or chrome morph. Reduced-motion removes the cover immediately. The root-mounted overlay records its initial boot, so client navigation replays neither sequence.
  - **Colours (boot-local):** near-black background `#0a0a0a`, cream text `#f4f0e8`.
  - **Shared clock:** one GSAP timeline drives story progress `p` 0→1 over ~7.4s content; BootField reads `p` every RAF via `getProgress` and its own elapsed `t` (Three Clock). Flow/silk uses `t`; density/converge/settle use `p`; hue drifts with `t` and calms as `p→1`.
  - **Beats:** (1) `it's craft, not code.` (2) `made with intention, not scripts.` (3) `hi — i'm aryan.` Typing locked to the same ~8s timeline.
  - **Field (simple arc):** void roam only (`p` 0–0.4) → all agents gather on **one center frame** around the typed line (`p` 0.4–0.75) → that frame morphs to measured `.void-chrome--home .portfolio-guide-float` (`p` 0.75–1) → lines-only settle. Every home ask measurement uses that scoped selector and can never select the compact non-home mini ask. Perimeter is a **rounded rect / pill** from computed `border-radius` (same outline as the ask bar). No header/footer rail redirects. Typed line is pinned to the ask-bar center; measure ask (+ padded `[data-boot-line]`); single centered-bar fallback if needed. Soft exit: hold aligned frame ~0.4s, then longer overlay fade onto the same void + ask home. Skip stays fast. Depth while roaming; circular nodes while moving.
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

**Morph (morph-first):** Chrome nav intercepts in-app clicks. Home ↔ site: measure→tween name/nav/ask (`MOTION.chrome.morph`), **then** `router.push`, then soft content fade. Site ↔ site: **exit → push → entry** shift on `.void-chrome-page` (`MOTION.chrome.pageExit` / `pageEnter`). See `docs/void-chrome-transitions.md`. Narrow/coarse: matched crossfade. `prefers-reduced-motion`: instant mode + push.

**Mini ask:** Compact wireframe input with the same three whisper hints (`ask · explain page · go to…`, tighter type); live reply + optional confirm chip in a non-layout-breaking panel (dropdown under the bar; fixed bottom sheet on small screens). Full transcript opens from a quiet glyph into a separate void **Chat history** overlay (same pattern on home). Remounts on site navigations via `remountKey`; transcript rehydrates from `sessionStorage`.

Boot → home theatre is unchanged (`BootOverlay` / ask-bar measure).

## Wireframes

### Link map

| Link | URL | Page |
|------|-----|------|
| Nav `home` | `/` | Minimal void: identity + ask + footer |
| Nav `workshop` | `/workshop` | Void-glass project tablet carousel (drag / arrows / dots / keyboard) |
| Nav `about` | `/about` | Void blog read: philosophy, background, education, availability |
| Nav `resume` | `/resume.pdf` | PDF download |

Do **not** link to `/index` anywhere — it aliases to `/` on some hosts. `/index` redirects to `/workshop` for old bookmarks only.

### Home (`/`) — Ask Aryan void

Minimal black void (`#0a0a0a`) site-wide via `:root` tokens. Home and all site routes share quiet void chrome (no accent band / bottom rule). Composition lives in `VoidChrome` (route page body is empty).

Editorial composition (desktop): oversized name top-left · centered ask + invite whisper + reply · right-rail section links · contacts footer.

- **Header (home):** hero-scale soft GSAP scramble of `aryan johari` (`MOTION.scramble` ~2.15s, `clamp(2.35rem, 8.75vw, 5.5rem)`) once after boot on a full load (initial paint is dots only — no final-name flash). Return-to-home settles without re-scramble. **No under-name role/tagline.** `prefers-reduced-motion`: final name immediately. Accessible via `aria-label` on the name link (`HomeIdentity`).
- **Center:** void wireframe ask bar (larger type/padding) with three whisper hints under the bar (`ask · explain page · go to…` — not a chip toolbar; `ask` focuses the input; `explain page` / `go to…` submit page-aware prompts), a soft invite whisper below the hints (`ask about this page or my work` — DOM type-once + `MOTION.medium` fade after boot; full text instantly if reduced-motion; one-line reserved height so the bar does not jump), and a **reserved live-reply band** below (latest answer only; absolute so streaming cannot shove the ask bar). When the API returns an allowlisted `navigateTo`, an ephemeral confirm (`go to {path}?` · Go · Stay) appears in that band — never auto-navigates. Quiet **Chat history** glyph (hidden until turns exist; sits clear of the hint row) opens a separate void overlay with the full session transcript + clear. Placeholder: `ask about this page or my work…`. Loading dots → character typewriter on the latest guide reply (~32 cps, capped ~3s); links become interactive when typing finishes. `prefers-reduced-motion`: full reply, no typewriter. No intro essay, no SaaS chip rails, no canvas quotes. Ask bar stays wireframe — no float/tilt chrome. Manual ask only (no auto Gemini).
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
│           │ ask about this page or my work…   send │      │
│           └─────────────────────────────────────────┘      │
│           ask · explain page · go to… (whisper)            │
│           ask about this page or my work (invite)          │
│           ┌─ live reply (scrolls) ──────────────────┐      │
│           │ latest guide answer · confirm go/stay   │      │
│           └─────────────────────────────────────────┘      │
│                                                             │
│  email · github · linkedin                                  │
└─────────────────────────────────────────────────────────────┘
```

**Boot → home morph:** void roam → one particle frame on `hi — i'm aryan.` → morph to measured `.portfolio-guide-float` bounds → soft hold + fade into the same void home (header + ask underneath; right-rail / under-ask links auto-fade shortly after boot). Boot signals `portfolio:boot-done` / `data-boot-done` for presence timing. Larger ask bar is picked up by live measure (no particle logic change).

**Void chrome CSS:** `.void-chrome`, `.void-chrome--home`, `.void-chrome--site`, `.void-chrome-name`, `.void-chrome-nav`, `.void-chrome-ask`, `.void-chrome-page`

**Home ask CSS classes:** `.portfolio-guide--home`, `.portfolio-guide-stage`, `.portfolio-guide-hints`, `.portfolio-guide-hint`, `.portfolio-guide-invite`, `.portfolio-guide-reply-slot`, `.portfolio-guide-live`, `.portfolio-guide-nav-confirm`, `.portfolio-guide-history-glyph`, `.portfolio-guide-history-panel`, `.portfolio-guide-transcript`, `.portfolio-guide-clear`

**Home header identity:** `.site-header-identity` (`HomeIdentity`) — name only

**Home soft section links:** `.home-glyph-row`, `.glyph-link`, `.glyph-link-label` (owned by `VoidChrome`) — desktop right-rail; mobile under-ask row

**Home footer contacts:** `.site-footer-chrome--contacts` (`HomeFooterChrome`)

**FeaturedDemos CSS classes:** `.featured-demos`, `.featured-demo-row`, `.featured-demo-title`, `.featured-demo-summary`, `.featured-demo-action`

### Workshop (`/workshop`)

Immersive project gallery — no featured demos. Same void site chrome as other non-home routes (compact name + nav + mini ask). Intro sits above a **self-contained Three.js stage**; footer remains reachable in normal document flow (no page pin).

**Transparent stage over Atmosphere:** the workshop owns its **own WebGL canvas** (`src/components/motion/WorkshopCarousel.ts`) which is transparent and layered over the site-wide Atmosphere canvas — never merged with it. `scene.background = null`, `WebGLRenderer({ alpha: true, premultipliedAlpha: true })`, `setClearColor(0x000000, 0)`, and `.project-gallery-stage` + canvas backgrounds are transparent. Stacking: Atmosphere `position: fixed; z-index: 0` → `.site-shell` / `.project-gallery-stage` `z-index: 1` → void chrome `z-index: 3`. Atmosphere trail reads **through** each tablet (near-zero fill) but is **deepened** behind the body by the per-tablet void shade, so the stack still reads as depth instead of the trail sliding over the glass. **No `transmission`** — Fresnel edge glow + rim contour keep the stage cheap and coherent with the quiet void.

**Gallery (`ProjectGallery`):** horizontal **WebGL edge-glow tablet carousel**. Active tablet centered with a small resting tilt so thickness / contour light read; neighbors offset on X, pushed back on Z, rotated away on Y (real coverflow). Footprint ~4.55×2.9, spacing ~4.15, volume depth ~0.72. Every layer shares one slug-seeded **softly chipped rectangular** outline. Smooth normals so the Fresnel silhouette stays continuous (not faceted wire noise).

**Responsive framing:** stage height is `min(54dvh, 30rem)` desktop / `min(46dvh, 24rem)` mobile so the footer stays reachable without scrolling past a giant stage. On every resize a **camera fit pass** dollies the camera so the active tablet occupies `fitWidthFrac`/`fitHeightFrac` of the frame (whichever axis binds, clamped `cameraZMin..cameraZMax`) — the tablet stays proportionate on short desktop stages and phones instead of a fixed world size cropping the frame.

**Page chrome:** same house pattern as About — `> workshop` + one short lede (*Selected projects — drag to browse.*). Carousel chrome is a single typographic row — borderless `←  02 / 05  →` (current index bright, total muted); no dots. Keyboard ←/→ / Home / End still jump; drag remains primary.

**Entrance / exit:** after WebGL mounts, tablets start extinguished and deep, then **rim-ignite** (contour + Fresnel ease up) while **depth-assemble** fans spacing/coverflow to rest; content plane fades in a beat later (`playEnter`, ~0.7s, `MOTION.workshop.enter*`). Intro copy + chrome get a quiet local opacity settle (`MOTION.medium`) so they don’t pop against the stage. On leave, `playExit` extinguishes the rim (~0.22s) while the canvas is still connected, then dispose. Reduced-motion uses the DOM fallback (no WebGL enter). VoidChrome’s page fade still owns the route-level transition — this is a stage-local secondary beat, not a second full-page fade.

Each tablet is **five meshes**, back → front:

0. **Void shade** — flat `ShapeGeometry` pane inset just inside the contour, near-black (`#04050a`) at low opacity, `depthWrite: false`. Because the workshop canvas composites *over* the Atmosphere canvas, this is the only occlusion cue available without merging canvases: it deepens the Atmosphere trail passing behind the body (~40% on the active tablet, ~26% on neighbors, faded further by index distance so overlapping panes never stack into a wall). Black rather than grey — against the bare void it is nearly invisible, so the tablet never reads as a filled card.
1. **Back plate** — Fresnel-only `ShaderMaterial` silhouette (no face fill); Atmosphere reads straight through.
2. **Thin beveled rim** — primary light-drawn contour (`opacity` ~0.78 + soft cream emissive); the only depth-writing layer so near edge correctly covers type.
3. **Content plane** — pure-alpha CanvasTexture at mid-Z. Left column: quiet status, cream title (hero), hook, and an **“open project ↗” pill** (1px cream border, no fill). Right column: **slug-hued visual placeholder pane** (same void-pane language as the fallback cards; swaps to a real screenshot via `drawImage` later). Stronger dark per-glyph halo for legibility on void. No monogram.
4. **Front plate** — same Fresnel silhouette as the back, slightly stronger; no clearcoat sheet, no tinted glass.

**Contour is Fresnel, not a wireframe.** Plate meshes use a tiny dedicated shader — `pow(1 − |N·V|, power)` → cream alpha, discard near zero. Rim keeps `MeshPhysicalMaterial` (clearcoat / env / mild iridescence) plus a light Fresnel inject. No `EdgesGeometry`, no line segments. Neighbor type and contour fade by index distance.

**Layer sorting:** explicit `renderOrder` per frame — far → near tablets, and inside each: shade → back → rim → type → front. Nothing relies on Three’s transparent depth sort.

**Environment / pointer immersion:** void gradient PMREM (cream zenith + cool orbs). Cool key + cream rim; enhanced hover adds tilt, light pull, and env/specular boost on the active contour. Tiny breathe only while hover is easing. No void-colour splash into the tablets — Atmosphere stays its own canvas underneath. Coarse/touch keeps drag + snap.

**Input:** **primary is drag/swipe** with inertia snap to nearest tablet (GSAP). Also ←/→ arrows, dots, index, keyboard when focused. Click/tap active tablet (raycast, not after a drag) or a11y link → `/projects/[slug]`.

**A11y & fallbacks:** Canvas is `aria-hidden`. DOM project list stays in the accessibility tree when WebGL is active. `prefers-reduced-motion`, missing WebGL, or `webglcontextlost` → dispose and show static DOM cards. Controls stay ≥44px.

**Perf:** `powerPreference: "low-power"`; `antialias` on enhanced desktop; DPR ≤2 enhanced / ≤1.35 otherwise; sharper content textures (~640×408 enhanced). **Render-on-demand** — RAF only while hover-tilt eases; idle leaves `raf = 0`. No transmission. Low bevel budgets; bump ≤256 on rim only; content canvases repaint only on resize/DPR. Full dispose of geometries, materials, textures, bump maps, env target and renderer on unmount.

```
┌─────────────────────────────────────────────────────────────┐
│ aryan johari (quiet)   home · workshop · about · …   [ask] │
│                                                             │
│  > workshop                                                 │
│  Selected projects… — drag to browse, then open…            │
│      ←  02 / 05  →   · · ● · ·     drag to browse           │
│                                                             │
│  (angled) │ ACTIVE edge-glow tablet  │ (angled) ← drag     │
│           │ Title · hook             │  cream type framed  │
│           │ status · open project    │  by light contour   │
│      (Atmosphere reads THROUGH the empty body)              │
│                                                             │
│ footer (normal flow below stage)                            │
└─────────────────────────────────────────────────────────────┘
```

**Workshop CSS classes:** `.workshop-page`, `.workshop-intro`, `.workshop-lede`, `.project-gallery`, `.project-gallery-chrome`, `.project-gallery-stage`, `.project-gallery-arrow`, `.project-gallery-fallback-list`, `.project-gallery-fallback-card`

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

**PortfolioGuide CSS classes:** `.portfolio-guide`, `.portfolio-guide--home`, `.portfolio-guide--mini`, `.portfolio-guide-float-wrap`, `.portfolio-guide-float`, `.portfolio-guide-form`, `.portfolio-guide-label`, `.portfolio-guide-input-row`, `.portfolio-guide-input`, `.portfolio-guide-submit`, `.portfolio-guide-hints`, `.portfolio-guide-hint`, `.portfolio-guide-hint-sep`, `.portfolio-guide-invite`, `.portfolio-guide-reply-slot`, `.portfolio-guide-live`, `.portfolio-guide-live--loading`, `.portfolio-guide-live--idle`, `.portfolio-guide-nav-confirm`, `.portfolio-guide-history-glyph`, `.portfolio-guide-history-layer`, `.portfolio-guide-history-panel`, `.portfolio-guide-transcript`, `.portfolio-guide-turn`, `.portfolio-guide-clear`, `.portfolio-guide-mini-panel`

### Project page (`/projects/[slug]`)

Single-column **exhibit** inside the wider project shell (`max-width: 1400px`). Story text stays ~72ch; diagram/stage can stretch wider. Shares the same void site chrome (mini ask included).

```
┌──────────────────────────────────────────────────────────────┐
│ name · nav · mini ask                                        │
├──────────────────────────────────────────────────────────────┤
│  live demo | exhibit | research                              │
│  Title                                                       │
│  CTAs · full description lede…                               │
│                                                              │
│  How it works                                                │
│  ┌ fitted Containers map ────────────┐  path beats (rail)   │
│  │ click marked nodes to Dive        │  (mobile: beats first)│
│  └───────────────────────────────────┘                       │
│  [Dive into architecture]                                    │
│                                                              │
│  Stack + Details                                             │
├──────────────────────────────────────────────────────────────┤
│ footer                                                       │
└──────────────────────────────────────────────────────────────┘
```

**Live / iframe:** primary action is **Open live demo ↗** (new tab). No full-page iframe hero on the slug page. Workshop cards stay the short hook; this page is the deeper exhibit.

**Exhibit registry demos:** Stage still renders `DemoPanel` with static sample content (after How it works when present).

**Diagram:** Every slug shows How it works. Owned graph IR renders as a fitted Containers overview with selectable path beats (node highlight, no camera). When `diagram.c4.diveTargets` is present, Dive opens a sheet/modal with C3 mermaid + caption. Missing IR uses the base flowchart. There is no pinned scroll or Mermaid walkthrough on the overview.

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

Facts stay aligned with resume / guide context (GSTF held-out FaceForensics++ **86.5%**). No workshop-style gallery, no boot replay, no seal/chapter gates.

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `MotionScaffold` | `src/components/motion/MotionScaffold.tsx` | Client-only Atmosphere + BootOverlay |
| `Atmosphere` | `src/components/motion/Atmosphere.tsx` | Site-wide void + soft pointer/touch trail (post-boot; light budget on mobile) |
| `BootOverlay` | `src/components/motion/BootOverlay.tsx` | Full home theatre or short non-home void wake; no client-navigation replay |
| `BootField` | `src/components/motion/BootField.ts` | Home-only void roam → one center frame → scoped home ask-bar morph |
| `HomeIdentity` | `src/components/motion/HomeIdentity.tsx` | Home soft-scramble hero name (once per load; no under-name role) |
| `HomeFooterChrome` | `src/components/motion/HomeFooterChrome.tsx` | Home contacts only (always visible) |
| `AboutAnchorNav` | `src/components/AboutAnchorNav.tsx` | About sticky section anchors + scroll-spy + heading fades |
| `VoidChrome` | `src/components/VoidChrome.tsx` | Persistent home/site void chrome; morph-first nav then `router.push` |
| `SiteFooter` | `src/components/SiteFooter.tsx` | Contacts; home uses HomeFooterChrome |
| `FeaturedDemos` | `src/components/FeaturedDemos.tsx` | Featured projects with wired demos |
| `PortfolioGuide` | `src/components/PortfolioGuide.tsx` | Home ask + invite/reply; mini ask + panel on site chrome |
| `ProjectGallery` | `src/components/ProjectGallery.tsx` | Workshop Three.js edge-glow tablet carousel (drag/snap; DOM a11y + fallback) |
| `WorkshopCarousel` | `src/components/motion/WorkshopCarousel.ts` | Page-local transparent WebGL factory for edge-glow tablets — Fresnel plates / type / rim (dispose on unmount) |
| `ProjectExhibit` | `src/components/ProjectExhibit.tsx` | Project exhibit: hero, How it works, stack, details |
| `ProjectDiagram` | `src/components/ProjectDiagram.tsx` | How it works — C4 explorer, owned fitted graph, or static base SVG |
| `ArchitectureJourney` | `src/components/ArchitectureJourney.tsx` | Selects the unified C4 path or owned-graph fallback |
| `C4ArchitectureExplorer` | `src/components/C4ArchitectureExplorer.tsx` | Full-bleed C1 → C2 → C3 state and navigation |
| `C4DiagramViewer` | `src/components/C4DiagramViewer.tsx` | Live C4 SVG fit, pan, touch pinch, zoom, and fullscreen |
| `ArchitectureGraphView` | `src/components/ArchitectureGraphView.tsx` | Owned IR → SVG fallback with highlighted path |
| `MermaidDiagram` | `src/components/MermaidDiagram.tsx` | Client Mermaid renderer with normalized C4 zoom activators |
| `DemoPanel` | `src/components/DemoPanel.tsx` | Exhibit sandbox (and unused iframe helper) |

## Responsive rules

| Breakpoint | Behaviour |
|------------|-----------|
| `< 1024px` | Exhibit stacks; How it works shows path story above full-width graph; Dive is a full-viewport sheet; workshop carousel drag/touch; ask send ≥44px |
| `≥ 1024px` | Index/about: 960px max-width. Project pages: wide shell; How it works = graph + story rail; Dive = side modal panel |
| All | Shell / header / footer respect `env(safe-area-inset-*)`; no horizontal page overflow (`overflow-x: clip`); `prefers-reduced-motion` skips graph/dive entrance |

## Demo panel states

Used on project pages for **registry exhibit** demos (and still available for iframe elsewhere). Live projects on `/projects/[slug]` prefer **Open live demo ↗** instead of embedding.

1. **Not wired** — dashed border, muted text: "Demo not wired"
2. **Iframe (live)** — header row (`sandbox` + open in new tab), embedded iframe. Loading overlay; fallback if embed blocked or load times out (~8s). On mobile, prominent **open in new tab** link above iframe. **Slug pages do not use this as the hero** — CTA-first.
3. **Exhibit (static)** — header row (`exhibit` + variant label), scrollable `<pre>` body with monospace sample content. Shown in the exhibit Stage section. Variants: `api-sample` (PII Gateway), `terminal-log` (ADA), `metrics` (GSTF). Content in `src/data/exhibits.ts`.
4. **Wired, not implemented** (`api`, `edge`) — solid border, shows demo type label + "Coming soon"

## Changing design decisions

Edit tokens in `src/app/globals.css`. Update this document when adding new tokens or components so docs stay the single source of truth.
