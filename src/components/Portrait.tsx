/**
 * Placeholder line drawing for the hero. The real one is Aryan's photo run
 * through Phosphene and exported as SVG; it replaces these paths.
 * pathLength="1" lets the CSS ink every stroke in with one dash length.
 */
export function Portrait() {
  return (
    <figure className="portrait">
      <svg viewBox="0 0 300 375" aria-hidden="true">
        {/* hair and face */}
        <path className="ink" pathLength={1} d="M92 132 C 82 70 128 40 165 48 C 202 55 222 92 208 136" />
        <path
          className="ink"
          pathLength={1}
          d="M150 62 C 102 62 86 110 90 150 C 95 200 120 236 150 236 C 180 236 205 200 210 150 C 214 110 198 62 150 62"
        />
        {/* features */}
        <path className="ink" pathLength={1} d="M116 146 q 11 -7 22 0 M 162 146 q 11 -7 22 0" />
        <path className="ink" pathLength={1} d="M151 152 L 145 186 q 6 5 12 0" />
        <path className="ink" pathLength={1} d="M134 206 q 16 8 32 0" />
        {/* neck, collar, shoulders */}
        <path className="ink" pathLength={1} d="M130 230 L 128 266 M 170 230 L 172 266" />
        <path className="ink" pathLength={1} d="M128 266 L 150 302 L 172 266" />
        <path className="ink" pathLength={1} d="M128 266 C 90 276 48 292 34 375 M 172 266 C 210 276 252 292 266 375" />
        {/* engraved shading, drawn last */}
        <path className="ink hatch" pathLength={1} d="M200 160 l -12 26 M 204 170 l -12 26 M 206 182 l -12 24 M 202 198 l -10 20" />
        <path className="ink hatch" pathLength={1} d="M60 330 l 20 -30 M 70 345 l 22 -32 M 82 358 l 22 -32 M 96 370 l 20 -28" />
        <path className="ink hatch" pathLength={1} d="M206 300 l 18 26 M 216 296 l 20 30 M 228 296 l 20 32" />
      </svg>
      <figcaption className="note">Fig. 1 · Placeholder drawing; the real one will come from Phosphene</figcaption>
    </figure>
  );
}
