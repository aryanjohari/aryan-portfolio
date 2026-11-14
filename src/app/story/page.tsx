import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { getProfile } from "@/lib/profile";
import { splitChapterLabel } from "@/lib/site-text";
import { getStoryText } from "@/lib/site-text-files";

export function generateMetadata(): Metadata {
  const story = getStoryText();
  return { title: `The long story · ${getProfile().name}`, description: story.summary };
}

/** Layout follows mockups/story.html. */
export default function StoryPage() {
  const story = getStoryText();
  const lastIndex = story.chapters.length - 1;

  return (
    <main id="main">
      <section className="opener story-opener grid" aria-labelledby="story-title">
        <div className="left-7">
          <p className="section-no">The long story</p>
          <h1 id="story-title">{story.title}</h1>
          <p className="story-summary">{story.summary}</p>
        </div>
      </section>

      <ol className="chapters">
        {story.chapters.map((chapter, index) => {
          const { place, when } = splitChapterLabel(chapter.label);
          const isNow = index === lastIndex;
          return (
            <li key={chapter.title} className={`grid${isNow ? " chapter-now" : ""}`}>
              <div className="left-3">
                <p className="section-no">
                  {String(index + 1).padStart(2, "0")}
                  {place && ` · ${place}`}
                  {isNow && <span className="dot" aria-hidden="true" />}
                </p>
                {when && <p className="chapter-when">{when}</p>}
              </div>
              <div className="mid-7">
                <h2>{chapter.title}</h2>
                <div className="chapter-text">
                  <ReactMarkdown>{chapter.body}</ReactMarkdown>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <nav className="next-link grid" aria-label="Next">
        <p className="left-3 section-no">Next</p>
        <Link className="mid-7" href="/#work">
          See the work →
        </Link>
      </nav>
    </main>
  );
}
