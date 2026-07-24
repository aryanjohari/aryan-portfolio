# Void chrome transitions — morph-first navigation

## Goal

Leaving `/` and returning should feel like **one intentional motion**:

1. Shared chrome (name · nav · ask) morphs between home and site layouts  
2. **Then** the destination page content appears  
3. Reverse on the way home  

Chrome stays outside page bodies. Home’s route body is empty — the chrome *is* the home page.

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
- It looked “bolted on” because it *was* bolted on after the router.

## New logic (morph-first, then push)

```
click in-app nav (home / workshop / about)
  → if reduced-motion: router.push immediately
  → if same chrome mode (site → site): router.push + soft content fade
  → if home ↔ site:
       1. prevent default navigation
       2. (site → home only) fade current page out, keep it mounted until morph starts
       3. measure chrome boxes
       4. switch chrome CSS mode (home | site) — still on the OLD route
       5. tween name / nav / ask first→last (MOTION.chrome.*)
       6. on complete → router.push(href)
       7. new page mounts under the already-settled chrome
       8. soft-fade content in
```

`resume.pdf` and external URLs are not intercepted (full navigation / download).

### Ownership

| Concern | Owner |
|---------|--------|
| Chrome layout mode (`home` \| `site`) | `VoidChrome` state (set **during** morph, before push) |
| URL / `{children}` | Next App Router (`router.push` **after** morph) |
| Content visibility | `.void-chrome-page` opacity after settle |
| Browser back/forward | Pathname sync: if mode ≠ path mode and not mid-morph, run morph then settle (or instant if reduced-motion) |

### Transition matrix

| From → To | Behavior |
|-----------|----------|
| `/` → `/workshop` etc. | Morph home→site, **then** push, fade content in |
| `/workshop` → `/` | Fade content out, morph site→home, **then** push (home body is empty) |
| `/workshop` → `/about` | Site chrome stays; push + soft content fade |
| Reduced motion | Instant mode + push; no morph |

## Implementation notes

- Nav links in `VoidChrome` call `navigate(href)` instead of naked instant client navigation for in-app routes.
- Morph uses the same measure→tween both directions (viewport-fixed first/last rects + name `fontSize`).
- Nav entrance offset (boot settle) runs **once** after boot — never again on return-to-home.
- Do not remount the home ask mid-morph (avoids invite replay); remount mini ask after arriving on site routes.

## Related

- UI spec: `docs/ui.md` (void chrome section)  
- Tokens: `MOTION.chrome` in `src/lib/motion-tokens.ts`  
- Shell: `src/components/VoidChrome.tsx`
