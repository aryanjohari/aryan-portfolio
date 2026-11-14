import type { ProfileEpigraph } from "@/lib/profile-schema";

/** A short quote under a section's label, small and quiet so the label is read first. */
export function Epigraph({ epigraph }: { epigraph: ProfileEpigraph | undefined }) {
  if (!epigraph) return null;
  return (
    <figure className="epigraph">
      <blockquote>“{epigraph.quote}”</blockquote>
      <figcaption>{epigraph.author}</figcaption>
    </figure>
  );
}
