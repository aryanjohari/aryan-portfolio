/** HTML/CSS layer above the WebGL canvas (z-index stacking). */
export function HelloWorldLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
      <h1 className="hero-reveal-text max-w-[90vw] text-center text-4xl font-light tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-6xl md:text-7xl">
        Hello world
      </h1>
    </div>
  );
}
