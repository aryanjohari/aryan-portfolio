import type { CSSProperties } from "react";

import { siteConfig } from "../../site.config";

/**
 * Maps `site.config` colors to CSS custom properties on `<html>`.
 * Tailwind tokens in `globals.css` reference `--site-color-*` so the UI stays config-driven.
 */
export function getSiteCssVariables(): CSSProperties {
  const { colors } = siteConfig;
  return {
    "--site-color-background": colors.background,
    "--site-color-surface": colors.surface,
    "--site-color-acid-accent": colors.acidAccent,
    "--site-color-text-primary": colors.textPrimary,
    "--site-color-text-muted": colors.textMuted,
  } as CSSProperties;
}
