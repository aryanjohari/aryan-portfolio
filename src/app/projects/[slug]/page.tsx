import { notFound } from "next/navigation";

/**
 * No project pages until v2 step 4 adds the project contract and story page.
 */
export function generateStaticParams() {
  return [];
}

export default function ProjectPage() {
  notFound();
}
