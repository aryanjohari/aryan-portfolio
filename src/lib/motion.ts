/**
 * Desktop-only enhanced motion gate.
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
