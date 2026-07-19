# UI Specification

## Design tokens

All tokens live as CSS custom properties in `src/app/globals.css`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f4f0e8` | Page background (off-white) |
| `--color-text` | `#0a0a0a` | Primary text (deep black) |
| `--color-border` | `#0a0a0a` | 1px borders, table rules |
| `--color-muted` | `#5a5a5a` | Secondary text, placeholders |
| `--color-accent-band` | `#ebe6dc` | Header accent background |
| `--space-1` | `8px` | Base grid unit |
| `--space-2` | `16px` | Standard padding |
| `--space-3` | `24px` | Section gaps |
| `--space-4` | `32px` | Page margins |
| `--font-mono` | IBM Plex Mono | Only font family used |

## Typography

- **Single family:** IBM Plex Mono via `next/font/google`
- **No display fonts, no sans-serif fallbacks in the shell**
- **Sizes:** 14px body, 12px table/meta, 18–24px page titles
- **Weight:** 400 regular, 600 for headings and nav emphasis

## Visual rules

- Flat surfaces only — no box-shadow, no backdrop-blur, no gradients except header accent
- 1px solid borders using `--color-border`
- No scroll hijacking, no smooth-scroll libraries, no page transitions
- Texture/grain/scanline **only** on the site header accent band
- Links: underline on hover, no colour change

## Enhanced motion (desktop scaffold)

Desktop-only GSAP + Three.js layer. Gate via `canUseEnhancedMotion()` in `src/lib/motion.ts`: enable only when `min-width: 1024px`, `pointer: fine`, and **not** `prefers-reduced-motion: reduce`. Server always returns false.

- **Atmosphere** (`src/components/motion/Atmosphere.tsx`) — fixed full-viewport canvas behind `.site-shell` (`pointer-events: none`, `z-index: 0`). Calm post-boot Three backdrop; pause/dispose on unmount and `document.hidden`.
- **Boot cover:** SSR `#boot-cover` (`#0a0a0a`, above `.site-shell`) prevents cream homepage flash before client BootOverlay. Inline script removes it immediately when the motion gate would fail; BootOverlay removes it in the same frame it mounts when the gate passes. Three/GSAP stay client-only and are not required for the dark cover.
- **BootOverlay** (`src/components/motion/BootOverlay.tsx`) — dark desktop boot theatre (~8s), then unmounts so guide input is never blocked.
  - **Colours (boot-local):** near-black background `#0a0a0a`, cream text `#f4f0e8`.
  - **Shared clock:** one GSAP timeline drives story progress `p` 0→1 over ~7.4s content; BootField reads `p` every RAF via `getProgress` and its own elapsed `t` (Three Clock). Flow/silk uses `t`; density/converge/settle use `p`; hue drifts with `t` and calms as `p→1`.
  - **Beats:** (1) `it's craft, not code.` (2) `made with intention, not scripts.` (3) `hi — i'm aryan.` Typing locked to the same ~8s timeline.
  - **Field (simple arc):** void roam only (`p` 0–0.4) → all agents gather on **one center frame** around the typed line (`p` 0.4–0.75) → that frame morphs to measured `.portfolio-guide-float` (`p` 0.75–1) → lines-only settle. Perimeter is a **rounded rect / pill** from computed `border-radius` (same outline as the ask bar). No header/footer rail redirects. Typed line is pinned to the ask-bar center; measure ask (+ padded `[data-boot-line]`); single centered-bar fallback if needed. Soft exit: hold aligned frame ~0.4s, then longer overlay fade onto the same void + ask home. Skip stays fast. Depth while roaming; circular nodes while moving.
  - **Perf:** 160 agents, trail length 24, DPR capped at 2, `powerPreference: "low-power"`. Target ~55–60fps on mid laptops; if weave drops below ~45fps on older MBAs, drop `AGENT_COUNT` to 128 in `BootField.ts`.
  - **Skip:** click anywhere or Escape; short fade then unmount. Subtle “click to enter” hint.
  - **Mobile / tablet / reduced-motion / coarse pointer:** no boot theatre, no boot Three sim — site shows immediately.
- Wired once via `MotionScaffold` in root `layout.tsx` (`dynamic(..., { ssr: false })`). Do not import three/gsap outside these client motion modules. No Framer Motion.

## Header accent texture

Applied via `.site-header-accent` pseudo-element on `SiteHeader`:

- Faint horizontal scanlines (`repeating-linear-gradient`)
- Optional subtle noise overlay at ~3% opacity
- Does not extend beyond the header band

## Wireframes

### Link map

| Link | URL | Page |
|------|-----|------|
| Nav `home` | `/` | Minimal void: identity header + ask bar + footer |
| Nav `workshop` | `/workshop` | Full project table only |
| Home soft `workshop` | `/workshop` | Same as workshop nav |
| Nav `about` | `/about` | Bio, education, availability |
| Home soft `about` | `/about` | Same as about nav |
| Nav `resume` | `/resume.pdf` | PDF download |
| Home soft `resume.pdf` | `/resume.pdf` | Same PDF |

Do **not** link to `/index` anywhere — it aliases to `/` on some hosts. `/index` redirects to `/workshop` for old bookmarks only.

### Home (`/`) — Ask Aryan void

Minimal black void (`#0a0a0a`) via `body:has(.home-ask)`; other routes keep the cream shell.

- **Header (home):** identity only — `aryan johari · graduate engineer · auckland · sept 2026` (no full nav).
- **Center:** void wireframe ask bar only (reply may appear under it after ask). No intro essay, no chip rails, no mid-page soft-link row.
- **Footer (home):** quiet `workshop · about · resume.pdf` plus `email · github · linkedin`.
- Ask bar: void fill (`#0a0a0a`), cream/off-white rounded outline, soft outer glow — reads as settled boot wireframe; off-white text + muted placeholder; ghost outline send. No GSAP float / no CSS 3D tilt. Mobile: same language, slightly tighter radius.

```
┌─────────────────────────────────────────────────────────────┐
│ aryan johari · graduate engineer · auckland · sept 2026     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ┌─ void wireframe ask bar ────┐               │
│              │ ask about me…          send │               │
│              └─────────────────────────────┘               │
│              (reply only after user send)                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ workshop · about · resume.pdf · email · github · linkedin   │
└─────────────────────────────────────────────────────────────┘
```

**Boot → home morph:** void roam → one particle frame on `hi — i'm aryan.` → morph to ask-bar bounds → soft hold + fade into the same void home (header + ask + footer already underneath).

**Home ask CSS classes:** `.home-ask`

**Home header identity:** `.site-header-identity`, `.site-header-role`

**Home footer soft links:** `.site-footer-soft-item`

**FeaturedDemos CSS classes:** `.featured-demos`, `.featured-demo-row`, `.featured-demo-title`, `.featured-demo-summary`, `.featured-demo-action`

### Workshop (`/workshop`)

Table only — no featured demos block, no guide.

```
┌─────────────────────────────────────────────────────────────┐
│ header                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  > workshop index                                           │
│  [ProjectTable — unchanged 4-column table]                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ footer                                                      │
└─────────────────────────────────────────────────────────────┘
```

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

Exhibit panels match iframe sandbox height. Header uses accent band; body scrolls on mobile.

**PortfolioGuide CSS classes:** `.portfolio-guide`, `.portfolio-guide-float-wrap`, `.portfolio-guide-float`, `.portfolio-guide-form`, `.portfolio-guide-label`, `.portfolio-guide-input-row`, `.portfolio-guide-input`, `.portfolio-guide-submit`, `.portfolio-guide-response`, `.portfolio-guide-response--loading`

### Project page (`/projects/[slug]`)

Wider shell (`max-width: 1400px`) than index/about. Desktop grid is **1fr : 3fr** (~25% narrative, ~75% sandbox).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ header (960px)                                                           │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │                                                           │
│  Background  │  ┌ sandbox ─────────────── open in new tab ────────────┐ │
│  Studio      │  │                                                       │ │
│  active      │  │                                                       │ │
│              │  │              [ iframe — ~75vh tall ]                  │ │
│  WebGL lab…  │  │                                                       │ │
│              │  │                                                       │ │
│  stack       │  │                                                       │ │
│  github →    │  └───────────────────────────────────────────────────────┘ │
│  (max 320px) │                                                           │
│              │                                                           │
├──────────────┴───────────────────────────────────────────────────────────┤
│ footer (960px)                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

Mobile: columns stack — narrative block first, full-width sandbox below (min-height ~50vh).

### About (`/about`)

```
┌─────────────────────────────────────────────────────────────┐
│ header                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  > about                                                    │
│                                                             │
│  Short bio paragraph…                                       │
│                                                             │
│  education                                                  │
│  ─────────                                                  │
│  Degree, institution, year                                  │
│                                                             │
│  availability                                               │
│  ────────────                                               │
│  Seeking graduate role · Auckland · from Sept 2026          │
│                                                             │
│  [ download resume.pdf ]                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ footer                                                      │
└─────────────────────────────────────────────────────────────┘
```

## Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `MotionScaffold` | `src/components/motion/MotionScaffold.tsx` | Client-only Atmosphere + BootOverlay |
| `Atmosphere` | `src/components/motion/Atmosphere.tsx` | Desktop Three.js backdrop canvas |
| `BootOverlay` | `src/components/motion/BootOverlay.tsx` | Desktop dark boot theatre (typed lines + shared p) |
| `BootField` | `src/components/motion/BootField.ts` | Void roam → one center frame → ask-bar morph |
| `SiteHeader` | `src/components/SiteHeader.tsx` | Accent band; home identity or full nav |
| `SiteFooter` | `src/components/SiteFooter.tsx` | Contacts; home also soft workshop/about/resume |
| `FeaturedDemos` | `src/components/FeaturedDemos.tsx` | Featured projects with wired demos |
| `PortfolioGuide` | `src/components/PortfolioGuide.tsx` | Void wireframe ask bar + reply (no chips) |
| `ProjectTable` | `src/components/ProjectTable.tsx` | Terminal index table |
| `ProjectSplit` | `src/components/ProjectSplit.tsx` | Two-column project layout |
| `DemoPanel` | `src/components/DemoPanel.tsx` | Demo sandbox or placeholder state |

## Responsive rules

| Breakpoint | Behaviour |
|------------|-----------|
| `< md` (768px) | Project split stacks vertically (narrative first); sandbox min-height ~50vh; table scrolls horizontally if needed |
| `≥ md` | Index/about: 960px max-width. Project pages: 1400px shell, **1fr / 3fr** split, sandbox ~`calc(100dvh - 12rem)` |

## Demo panel states

1. **Not wired** — dashed border, muted text: "Demo not wired"
2. **Iframe (live)** — header row (`sandbox` + open in new tab), embedded iframe filling a tall panel (~75vh desktop / ~50vh mobile). Loading overlay while iframe loads; fallback if embed blocked or load times out (~8s). On mobile, prominent **open in new tab** link above iframe.
3. **Exhibit (static)** — header row (`exhibit` + variant label), scrollable `<pre>` body with monospace sample content. Same min-height as iframe panel. Variants: `api-sample` (PII Gateway), `terminal-log` (ADA), `metrics` (GSTF). Content in `src/data/exhibits.ts`.
4. **Wired, not implemented** (`api`, `edge`) — solid border, shows demo type label + "Coming soon"

## Changing design decisions

Edit tokens in `src/app/globals.css`. Update this document when adding new tokens or components so docs stay the single source of truth.
