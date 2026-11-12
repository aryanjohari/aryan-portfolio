import Link from "next/link";

import { ProjectLinks } from "@/components/ProjectLinks";
import { StatusStamp } from "@/components/StatusStamp";
import { type Project, STORY_PARTS } from "@/lib/portfolio-schema";

const STORY_HEADINGS: Record<(typeof STORY_PARTS)[number], string> = {
  problem: "The problem",
  built: "What I built",
  decision: "The key decision",
  learned: "What I learned",
  next: "What's next",
};

export function StoryPage({ project }: { project: Project }) {
  const { visibility, story } = project;

  return (
    <article>
      <p className="label">
        <Link href="/">Home</Link> / projects
      </p>
      <h1 className="page-heading">{project.title}</h1>
      <p className="hero-tagline">{project.summary}</p>
      <StatusStamp status={project.status} />
      <ProjectLinks links={project.links} />

      {project.face && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="project-face" src={project.face} alt="" width={1200} height={630} />
      )}

      <dl className="facts">
        <dt className="label">Proves</dt>
        <dd>{project.proves}</dd>
        <dt className="label">Role</dt>
        <dd>{project.role}</dd>
        <dt className="label">Dates</dt>
        <dd>{project.dates}</dd>
        <dt className="label">Stack</dt>
        <dd>{project.stack.join(", ")}</dd>
        <dt className="label">Proof</dt>
        <dd>{project.proof.join(" · ")}</dd>
        {visibility.code === "private" && (
          <>
            <dt className="label">Code</dt>
            <dd>Private{visibility.cannot_show && `: ${visibility.cannot_show}`}</dd>
          </>
        )}
      </dl>

      {story &&
        STORY_PARTS.map((part) => (
          <section key={part} className="section" aria-labelledby={`story-${part}`}>
            <h2 id={`story-${part}`} className="section-heading">
              {STORY_HEADINGS[part]}
            </h2>
            <p className="story-text">{story[part]}</p>
          </section>
        ))}
    </article>
  );
}
