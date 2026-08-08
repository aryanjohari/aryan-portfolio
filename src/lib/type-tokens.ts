/**
 * Shared type + ink language for the void shell.
 *
 * Mirror into `:root` in `src/app/globals.css` — keep in sync.
 * Do not apply these to architecture diagram surfaces
 * (`.project-diagram*`, `.arch-*`, `.c4-*`, `.dg-*`, Mermaid SVG labels).
 *
 * Use CSS vars (`--type-*`, `--color-*`) in stylesheets.
 * Import `TYPE` / `INK` only when JS needs the same values.
 */

export const TYPE = {
  /** Root `html` font-size in px — rem scale baseline */
  rootPx: 17,
  body: "1rem",
  /** Secondary / chrome / meta — floor for most UI copy */
  meta: "0.875rem",
  /** Smallest allowed site type (labels, captions) */
  caption: "0.8125rem",
  /** Quiet page headings (`> about`, etc.) */
  heading: "1.125rem",
  /** Emphasized section / exhibit titles */
  title: "clamp(1.5rem, 3vw, 2rem)",
  /** Home identity / display */
  display: "clamp(2.35rem, 8.75vw, 5.5rem)",
} as const;

export const INK = {
  /** Primary cream */
  text: "#f4f0e8",
  /** Secondary — readable on `#0a0a0a` */
  muted: "#c4bfb6",
  /** Soft secondary (placeholders, separators, idle) */
  faint: "rgba(244, 240, 232, 0.72)",
  border: "rgba(244, 240, 232, 0.22)",
} as const;

export type TypeScale = keyof Omit<typeof TYPE, "rootPx">;
export type InkTone = keyof typeof INK;
