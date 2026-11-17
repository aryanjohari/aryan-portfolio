/**
 * The hero picture: a CC0 photo of a Roman marble bust (the Met, via Wikimedia Commons)
 * exported from Phosphene's Topographic preset in its paper and phosphor palettes, the
 * same palettes as the site's two themes. CSS shows the one that matches the theme;
 * both are lazy so the hidden one is never downloaded.
 */
export function Portrait() {
  return (
    <figure className="portrait">
      {/* Plain <img>: fixed files in public/, so next/image adds nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="portrait-paper" src="/portrait-paper.jpg" alt="" width={800} height={1000} loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="portrait-phosphor" src="/portrait-phosphor.jpg" alt="" width={800} height={1000} loading="lazy" />
      <figcaption className="note">Fig. 1 · A Roman marble bust, drawn by Phosphene</figcaption>
    </figure>
  );
}
