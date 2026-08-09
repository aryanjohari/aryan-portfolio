type StackMarqueeProps = {
  stack: string[];
};

function stackGlyph(label: string): string {
  const clean = label.replace(/[^a-zA-Z0-9+.#]/g, "");
  if (clean.length <= 2) return clean.toUpperCase() || "?";
  const parts = label.split(/[\s/-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Quiet looping skill belt under the hero — monogram tiles + labels.
 * CSS-driven; pauses with prefers-reduced-motion.
 */
export function StackMarquee({ stack }: StackMarqueeProps) {
  if (stack.length === 0) {
    return <span className="project-details-empty">—</span>;
  }

  const loop = [...stack, ...stack];

  return (
    <div className="stack-marquee">
      <ul className="visually-hidden">
        {stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <ul className="stack-marquee-track" aria-hidden="true">
        {loop.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="stack-marquee-item"
            data-exhibit-skill-tag
          >
            <span className="stack-marquee-glyph">{stackGlyph(item)}</span>
            <span className="stack-marquee-label">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
