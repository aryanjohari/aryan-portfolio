/** A project's picture, or a hatched frame holding its place until the real one exists. */
export function Picture({ src, label, className = "" }: { src?: string; label: string; className?: string }) {
  if (src) {
    // Plain <img>: pictures are fixed files already in public/, so next/image adds nothing.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`photo-image ${className}`} src={src} alt="" width={1200} height={800} loading="lazy" />;
  }
  return (
    <div className={`photo ${className}`} aria-hidden="true">
      {label}: picture to come
    </div>
  );
}
