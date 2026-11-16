/**
 * The hero picture: a CC0 photo of a Roman marble bust (the Met, via Wikimedia Commons)
 * exported from Phosphene's Topographic preset. It is above the fold, so it loads eagerly.
 */
export function Portrait() {
  return (
    <figure className="portrait">
      {/* Plain <img>: a fixed file in public/, so next/image adds nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/portrait.jpg" alt="" width={800} height={1000} fetchPriority="high" />
      <figcaption className="note">Fig. 1 · A Roman marble bust, drawn by Phosphene</figcaption>
    </figure>
  );
}
