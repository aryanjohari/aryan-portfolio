/**
 * A project's or job's picture, or a title card drawn from its own words until a real one
 * exists. The card is aria-hidden because the same title is already in the page text.
 */
export function Picture({
  src,
  label,
  detail,
  className = "",
}: {
  src?: string;
  label: string;
  detail?: string;
  className?: string;
}) {
  if (src) {
    // Plain <img>: pictures are fixed files already in public/, so next/image adds nothing.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`photo-image ${className}`} src={src} alt="" width={1200} height={800} loading="lazy" />;
  }
  return (
    <div className={`photo title-card ${className}`} aria-hidden="true">
      <span className="title-card-label">{label}</span>
      {detail && <span className="title-card-detail">{detail}</span>}
    </div>
  );
}
