import Link from "next/link";

import { HomeIntro } from "@/components/HomeIntro";
import { PortfolioGuide } from "@/components/PortfolioGuide";
import guideContext from "@/lib/guide-context.json";
import type { GuideContextFile } from "@/lib/guide-schema";

const context = guideContext as GuideContextFile;

export default function Home() {
  return (
    <div className="home-ask">
      <HomeIntro />
      <PortfolioGuide suggestedChips={context.suggestedChips} />
      <nav className="home-ask-links" aria-label="Site links">
        <Link href="/workshop" title="Full project catalog">
          workshop
        </Link>
        <span className="home-ask-links-sep" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <Link href="/about" title="Bio and background">
          about
        </Link>
        <span className="home-ask-links-sep" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <Link href="/resume.pdf" title="Download PDF resume">
          resume.pdf
        </Link>
      </nav>
    </div>
  );
}
