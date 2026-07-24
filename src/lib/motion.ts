/**
 * Cross-device theatre gate (boot + Atmosphere).
 * Safe on the server (always false). Client: only requires motion is allowed.
 */
export function canUseTheatreMotion(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Desktop extras gate (gallery rotateY, dense particle budgets).
 * Safe on the server (always false). Client: all media queries must match.
 */
export function canUseEnhancedMotion(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(min-width: 1024px)").matches &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Removes the SSR `#boot-cover` flash shield (no-op if already gone). */
export function removeBootCover(): void {
  if (typeof document === "undefined") return;
  document.getElementById("boot-cover")?.remove();
}

/** Fired once when boot theatre finishes or is skipped (incl. reduced-motion). */
export const BOOT_DONE_EVENT = "portfolio:boot-done";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isBootDone(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.bootDone === "1";
}

/** Idempotent: marks boot complete and notifies home presence listeners. */
export function signalBootDone(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (document.documentElement.dataset.bootDone === "1") return;
  document.documentElement.dataset.bootDone = "1";
  window.dispatchEvent(new CustomEvent(BOOT_DONE_EVENT));
}
