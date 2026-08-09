# Void chrome transitions — morph-first navigation

## Goal

Leaving `/` and returning should feel like **one intentional motion**:

1. Shared chrome (name · nav · ask) morphs between home and site layouts
2. **Then** the destination page content appears
3. Reverse on the way home

Chrome stays outside page bodies. Home’s route body is empty — the chrome _is_ the home page.

## Why the old logic was wrong

The first implementation **reacted after** Next.js had already navigated:

```
click Link → URL + {children} swap immediately
           → hide new page (opacity: 0)
           → measure/tween chrome to “catch up”
           → fade page in
```

Problems:

- **Navigation and animation were decoupled.** The page was already mounted (and often running effects) while chrome tried to fake a morph.
- **Opacity:0 was a bandage** for “content arrived too early,” not a real sequence.
- **Home ↔ site layout systems differ** (hero + fixed glyph rail vs compact top bar). Post-route FLIP/measure-tween fought fixed positioning and competing nav entrance tweens → jagged reverse morphs.
- It looked “bolted on” because it _was_ bolted on after the router.

## New logic (morph-first, then push)

```
click in-app nav (home / workshop / about)
  → if reduced-motion: sync mode + router.push immediately
  → if same chrome mode (site → site):
       1. EXIT .void-chrome-page (opacity + slight y up)
       2. await exit → router.push(href)
       3. pathname settle → scroll to top → ENTRY (opacity + slight y up→0)
  → if home ↔ site:
       1. prevent default navigation
       2. (site → home only) fade current page out, keep it mounted until morph starts
       3. measure chrome boxes
       4. switch chrome CSS mode (home | site) — still on the OLD route
       5. tween name / nav / ask first→last (MOTION.chrome.*)
       6. on complete → router.push(href)
       7. new page mounts under the already-settled chrome
       8. soft-fade / entry content in
```

`resume.pdf` and external URLs are not intercepted (full navigation / download).

### Hybrid chrome morph (home ↔ site)

Desktop / fine pointer — serialized with soft ~15% overlaps:

1. Fade **ask** out, then **nav** out.
2. Switch chrome mode; remount ask **while companions are hidden**.
3. FLIP the **name** only (position + `fontSize`), with an in-flow **spacer** holding the destination name slot so nav/ask don’t reflow.
4. Unpin name into the reserved slot, drop spacer, wait one frame.
5. Fade **nav** in, then **ask** in.

Narrow / coarse: whole-chrome opacity crossfade (ask remounted mid-fade when hidden).

Do not FLIP nav or ask — those geometry changes were the snap source.

| Concern                               | Owner                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome layout mode (`home` \| `site`) | `VoidChrome` state (set **during** morph, before push)                                                                                       |
| URL / `{children}`                    | Next App Router (`router.push` **after** morph / exit)                                                                                       |
| Content visibility                    | `.void-chrome-page` opacity (+ y on site↔site) after settle                                                                                  |
| Browser back/forward                  | Pathname sync: if mode ≠ path mode and not mid-morph, run morph then settle (or instant if reduced-motion). Same-mode: entry only (no exit). |

### Transition matrix

| From → To                     | Behavior                                                                |
| ----------------------------- | ----------------------------------------------------------------------- |
| `/` → `/workshop` etc.        | Morph home→site, **then** push, content entry                           |
| `/workshop` → `/`             | Fade content out, morph site→home, **then** push (home body is empty)   |
| `/workshop` → `/about` (etc.) | Site chrome stays; **exit → push → entry** shift on `.void-chrome-page` |
| `/projects` → `/projects/*`   | Same site↔site curtain (slugs are in-app chrome routes)                 |
| Reduced motion                | Instant mode + push; no morph / no exit-entry motion                    |

### Consistent curtain

Across exit/morph → `router.push` → enter, `.void-chrome-page` stays closed via inline opacity + `html[data-page-curtain]` (CSS `opacity: 0 !important`). The flag clears only when entry animation starts (or settle under reduced motion). A `useLayoutEffect` also closes the curtain before paint on site landings so back/forward cannot flash full content. In-app content links and `useVoidChromeNavigate()` share this path.

## Site ↔ site content transition

When both routes share chrome mode `site` (workshop ↔ about ↔ `/projects/[slug]`):

1. **Exit** (still on the old route): `.void-chrome-page` fades out and shifts slightly up (`y: 0 → -8px`), `MOTION.chrome.pageExit` (~0.28s), ease `power2.in`. Pointer-events none for the duration.
2. **Push:** `await` exit completion, then `router.push(href)` (same pattern as site→home awaiting `fadeContent(0)` before morph).
3. **Entry** (pathname settle, `drivenByUs`): `window.scrollTo(0, 0)`, then opacity + `y: +12px → 0` with `MOTION.chrome.pageEnter` (~0.4s) and `MOTION.ease` (`power2.out`). Restore pointer-events; clear transform via `clearProps`.

**Tokens:** `MOTION.chrome.pageExit` / `MOTION.chrome.pageEnter` in `src/lib/motion-tokens.ts`. Morph path still uses `MOTION.chrome.content` for opacity-only fades around home↔site.

**Guard:** `pageTransitioningRef` blocks rapid double-clicks while exit→push→entry is in flight (separate from `morphingRef` / `data-chrome-morphing`).

**Reduced motion:** no exit/entry tweens — instant swap, opacity 1, pointer-events auto (existing reduced-motion push path).

**Back/forward & Links outside VoidChrome:** the page has already swapped. Run **entry only** (or instant under reduced motion). Do **not** attempt an exit animation.

**Interrupt safety:** killing mid-tween settles site pages to opacity 1 / usable pointer-events; never force-show content on home.

The whole `.void-chrome-page` animates as one block so nested mount effects (`ProjectGallery`, `AboutAnchorNav`, `ProjectDiagram`) are not remounted or delayed.

**Workshop gallery (page-local, not chrome):** `/projects` (legacy `/workshop` redirect) mounts a self-contained Three.js edge-glow tablet carousel (`WorkshopCarousel`) inside `ProjectGallery`. It is independent of Atmosphere and BootField — separate canvas, disposed when leaving the page. CSS fake-3D coverflow + ScrollTrigger pin/scrub was dropped; the route is a **one-viewport flex shell** (no page scroll) with drag/snap as the primary control. See `docs/ui.md` Workshop section.

## Implementation notes

- Nav links in `VoidChrome` call `navigate(href)` instead of naked instant client navigation for in-app routes.
- Morph uses the same measure→tween both directions (viewport-fixed first/last rects + name `fontSize`).
- Nav entrance offset (boot settle) runs **once** after boot — never again on return-to-home.
- Do not remount the home ask mid-morph (avoids invite replay); remount mini ask after arriving on site routes.

## Related

- UI spec: `docs/ui.md` (void chrome section)
- Tokens: `MOTION.chrome` in `src/lib/motion-tokens.ts`
- Shell: `src/components/VoidChrome.tsx`
