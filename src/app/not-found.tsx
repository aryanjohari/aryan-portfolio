import type { Metadata } from "next";
import Link from "next/link";

import { getProfile } from "@/lib/profile";

export function generateMetadata(): Metadata {
  return { title: `Page not found · ${getProfile().name}` };
}

export default function NotFound() {
  return (
    <main id="main" className="site-main">
      <p className="label">404</p>
      <h1 className="page-heading">Page not found</h1>
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </main>
  );
}
