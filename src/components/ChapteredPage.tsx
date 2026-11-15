import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { splitChapterLabel, type StoryText } from "@/lib/site-text";

/**
 * A title, a summary and numbered `## ` chapters (mockups/story.html): the
 * long story and the Ask box's "How this works" page. `lastIsNow` marks the
 * final chapter in the accent, as the story's "Now".
 */
export function ChapteredPage({ eyebrow, page, lastIsNow = false }: { eyebrow: string; page: StoryText; lastIsNow?: boolean }) {
  const lastIndex = page.chapters.length - 1;

  return (
    <main id="main">
      <section className="opener story-opener grid" aria-labelledby="page-title">
        <div className="left-7">
          <p className="section-no">{eyebrow}</p>
          <h1 id="page-title">{page.title}</h1>
          <p className="story-summary">{page.summary}</p>
        </div>
      </section>

      <ol className="chapters">
        {page.chapters.map((chapter, index) => {
          const { place, when } = splitChapterLabel(chapter.label);
          const isNow = lastIsNow && index === lastIndex;
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
