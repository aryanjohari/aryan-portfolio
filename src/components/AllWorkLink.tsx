import Link from "next/link";

/** The way back from a project page to the work list on the home page. */
export function AllWorkLink({ className = "" }: { className?: string }) {
  return (
    <p className={`section-no back-link ${className}`}>
      <Link href="/#work">← All work</Link>
    </p>
  );
}
