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

### Index (`/`)

```
┌─────────────────────────────────────────────────────────────┐
│ ░░ scanline accent band ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ aryan johari          index · about · resume                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  > workshop index                                           │
│                                                             │
│  ┌──────────────┬─────────────────┬──────────┬──────────┐ │
│  │ name         │ stack           │ status   │ demo     │ │
│  ├──────────────┼─────────────────┼──────────┼──────────┤ │
│  │ background-… │ TypeScript, …   │ active   │ —        │ │
│  │ sound-vis…   │ Web Audio, …    │ active   │ —        │ │
│  │ pii-gateway  │ Python, …       │ active   │ —        │ │
│  │ ada          │ Raspberry Pi, … │ wip      │ —        │ │
│  │ gstf         │ PyTorch, …      │ archived │ —        │ │
│  └──────────────┴─────────────────┴──────────┴──────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ email · github · linkedin                                   │
└─────────────────────────────────────────────────────────────┘
```

### Project page (`/projects/[slug]`)

```
┌─────────────────────────────────────────────────────────────┐
│ header (same as index)                                      │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│  PII Gateway             │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  active                  │  │                            │  │
│                          │  │   demo not wired           │  │
│  FastAPI middleware…     │  │                            │  │
│                          │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  Stack: Python, FastAPI  │                                  │
│  GitHub →                │                                  │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ footer                                                      │
└─────────────────────────────────────────────────────────────┘
```

Mobile: columns stack — narrative block first, demo panel below.

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
| `ProjectTable` | `src/components/ProjectTable.tsx` | Terminal index table |
| `ProjectSplit` | `src/components/ProjectSplit.tsx` | Two-column project layout |
| `DemoPanel` | `src/components/DemoPanel.tsx` | Demo sandbox or placeholder state |

## Responsive rules

| Breakpoint | Behaviour |
|------------|-----------|
| `< md` (768px) | Project split stacks vertically; table scrolls horizontally if needed |
| `≥ md` | Project split is 1fr / 1fr grid; table full width |

## Demo panel states

1. **Not wired** — dashed border, muted text: "Demo not wired"
2. **Wired, not implemented** — solid border, shows demo type label + "Coming soon"
3. **Live (Phase 2+)** — renders iframe, API playground, exhibit gallery, or edge proxy UI

## Changing design decisions

Edit tokens in `src/app/globals.css`. Update this document when adding new tokens or components so docs stay the single source of truth.
