import type { Metadata } from "next";
import Link from "next/link";

import { getProfile } from "@/lib/profile";

export function generateMetadata(): Metadata {
  return { title: `Page not found · ${getProfile().name}` };
}

export default function ProjectNotFound() {
  return (
    <main id="main" className="site-main">
      <p className="label">404</p>
      <h1 className="page-heading">No project with that name</h1>
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </main>
  );
}
