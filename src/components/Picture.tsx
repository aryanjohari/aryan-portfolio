import Image from "next/image";

/**
 * A project's or job's picture, or a title card drawn from its own words until a real one
 * exists. The card is aria-hidden because the same title is already in the page text.
 */
export function Picture({
  src,
  label,
  detail,
  className = "",
  sizes = "(max-width: 760px) 100vw, 50vw",
  eager = false,
}: {
  src?: string;
  label: string;
  detail?: string;
  className?: string;
  /** How wide the picture shows, so next/image sends a phone a phone-sized file. */
  sizes?: string;
  /** For the page's main picture: lazy loading would delay the largest paint. */
  eager?: boolean;
}) {
  if (src) {
    return (
      <Image
        className={`photo-image ${className}`}
        src={src}
        alt=""
        width={1200}
        height={800}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        // SVG title faces are already tiny and next/image refuses SVG by default.
        unoptimized={src.endsWith(".svg")}
      />
    );
  }
  return (
    <div className={`photo title-card ${className}`} aria-hidden="true">
      <span className="title-card-label">{label}</span>
      {detail && <span className="title-card-detail">{detail}</span>}
    </div>
  );
}
