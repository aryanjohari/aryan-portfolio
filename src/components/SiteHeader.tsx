import Link from "next/link";

import { AskBox } from "@/components/AskBox";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Profile } from "@/lib/profile-schema";

/** `askEnabled` is false when there is no Gemini key, so the Ask box is left out entirely. */
export function SiteHeader({ name, links, askEnabled }: { name: string; links: Profile["links"]; askEnabled: boolean }) {
  return (
    <header className={askEnabled ? "masthead with-ask" : "masthead"}>
      <Link className="masthead-name" href="/">
        {name}
      </Link>
      {askEnabled && <AskBox />}
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
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
}
