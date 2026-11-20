import Image from "next/image";

/**
 * The hero picture: a CC0 photo of a Roman marble bust (the Met, via Wikimedia Commons)
 * exported from Phosphene's Topographic preset in its paper and phosphor palettes, the
 * same palettes as the site's two themes. CSS shows the one that matches the theme;
 * both are lazy so the hidden one is never downloaded.
 */
// Phones: 75% of the screen; wider screens: capped at 70vh tall, so at most about 560px wide.
const PORTRAIT_SIZES = "(max-width: 760px) 75vw, 560px";

export function Portrait() {
  return (
    <figure className="portrait">
      {/* next/image so a phone gets a small WebP instead of the full JPG. */}
      <Image className="portrait-paper" src="/portrait-paper.jpg" alt="" width={800} height={1000} sizes={PORTRAIT_SIZES} loading="lazy" />
      <Image className="portrait-phosphor" src="/portrait-phosphor.jpg" alt="" width={800} height={1000} sizes={PORTRAIT_SIZES} loading="lazy" />
      <figcaption className="note">Fig. 1 · A Roman marble bust, drawn by Phosphene</figcaption>
    </figure>
  );
}
