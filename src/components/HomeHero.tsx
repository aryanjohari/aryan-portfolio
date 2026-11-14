import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { Portrait } from "@/components/Portrait";
import type { Profile } from "@/lib/profile-schema";
import type { HomeText } from "@/lib/site-text";

export function HomeHero({ profile, text }: { profile: Profile; text: HomeText }) {
  const { links } = profile;
  const city = profile.location.split(",")[0];

  return (
    <section className="opener grid" aria-labelledby="home-headline">
      <div className="left-7">
        <p className="section-no">
          No. 01 · {city}, {new Date().getFullYear()}
        </p>
        <h1 id="home-headline">
          {/* Only *italics* survive, so the headline can't grow links or paragraphs. */}
          <ReactMarkdown allowedElements={["em"]} unwrapDisallowed>
            {text.headline}
          </ReactMarkdown>
        </h1>
        <div className="lead hero-bio">
          <ReactMarkdown>{text.bio}</ReactMarkdown>
        </div>
        <p className="hero-links">
          <Link className="story-link" href="/story">
            Read the long story →
          </Link>
        </p>
        <p className="contact-line">
          <a href={links.cv}>CV</a> · <a href={`mailto:${links.email}`}>Email</a> ·{" "}
          <a href={links.github}>GitHub</a> · <a href={links.linkedin}>LinkedIn</a>
        </p>
      </div>
      <div className="right-5">
        <Portrait />
      </div>
    </section>
  );
}
