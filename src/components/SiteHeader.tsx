import Link from "next/link";

import type { Profile } from "@/lib/profile-schema";

export function SiteHeader({ name, links }: { name: string; links: Profile["links"] }) {
  return (
    <header className="masthead">
      <Link className="masthead-name" href="/">
        {name}
      </Link>
      <nav aria-label="Site">
        <ul>
          <li>
            <Link href="/#work">Work</Link>
          </li>
          <li>
            <a href={`mailto:${links.email}`}>Email</a>
          </li>
          <li>
            <a href={links.github}>GitHub</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
