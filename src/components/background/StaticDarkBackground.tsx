/** Fixed dark layer — SSR-safe fallback and mobile path (no WebGL). */
export function StaticDarkBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-[#0c1528]"
      aria-hidden
    />
  );
}
