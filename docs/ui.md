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

## Header accent texture

Applied via `.site-header-accent` pseudo-element on `SiteHeader`:

- Faint horizontal scanlines (`repeating-linear-gradient`)
- Optional subtle noise overlay at ~3% opacity
- Does not extend beyond the header band

## Wireframes

### Link map

| Link | URL | Page |
|------|-----|------|
| Nav `home` | `/` | Narrative intro + portfolio guide |
| Nav `workshop` | `/workshop` | Full project table only |
| HomeIntro catalog link | `/workshop` | Same as workshop nav |
| Nav `about` | `/about` | Bio, education, availability |
| Nav `resume` | `/resume.pdf` | PDF download |

Do **not** link to `/index` anywhere — it aliases to `/` on some hosts. `/index` redirects to `/workshop` for old bookmarks only.

### Home (`/`) — guide-focused

Header: `home · workshop · about · resume`. No new fonts, no shadows, no WebGL on shell.

```
┌─────────────────────────────────────────────────────────────┐
│ ░░ scanline accent band ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ aryan johari          home · workshop · about · resume        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [HomeIntro — compact variant]                              │
│  aryan johari                                               │
│  graduate software engineer · auckland                      │
│  [1 short narrative paragraph]                              │
│  5 projects · view catalog →                                │
│  resume.pdf · more about me                                 │
│                                                             │
│  [PortfolioGuide]                                           │
│  > guide                                                    │
│  [prompt chips]                                             │
│  [input________________________] [send]                     │
│  ┌ response panel ───────────────────────────────────────┐ │
│  │ reply or …                                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ email · github · linkedin                                   │
└─────────────────────────────────────────────────────────────┘
```

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

**HomeIntro CSS classes:** `.home-intro`, `.home-intro-name`, `.home-intro-role`, `.home-intro-narrative`, `.home-intro-narrative--compact`, `.home-intro-demos`, `.home-intro-catalog-link`, `.home-intro-stats`, `.home-intro-stat`, `.home-intro-links`

**FeaturedDemos CSS classes:** `.featured-demos`, `.featured-demo-row`, `.featured-demo-title`, `.featured-demo-summary`, `.featured-demo-action`

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

**PortfolioGuide CSS classes:** `.portfolio-guide`, `.portfolio-guide-chips`, `.portfolio-guide-chip`, `.portfolio-guide-chip--more`, `.portfolio-guide-form`, `.portfolio-guide-input`, `.portfolio-guide-submit`, `.portfolio-guide-response`, `.portfolio-guide-response--loading`

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
| `SiteHeader` | `src/components/SiteHeader.tsx` | Accent band, site name, nav links |
| `SiteFooter` | `src/components/SiteFooter.tsx` | Email, GitHub, LinkedIn |
| `HomeIntro` | `src/components/HomeIntro.tsx` | Name, role, narrative, stats or index link, resume/about links |
| `FeaturedDemos` | `src/components/FeaturedDemos.tsx` | Featured projects with wired demos |
| `PortfolioGuide` | `src/components/PortfolioGuide.tsx` | Guide input, prompt chips, reply panel |
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
