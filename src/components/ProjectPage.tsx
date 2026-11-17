import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

import { AllWorkLink } from "@/components/AllWorkLink";
import { Picture } from "@/components/Picture";
import { ProjectVideo } from "@/components/ProjectVideo";
import { SharedPicture } from "@/components/SharedPicture";
import { type Project, STORY_HEADINGS, STORY_PARTS } from "@/lib/portfolio-schema";
import { factsLine, proofLine } from "@/lib/project-display";

/** A paragraph that is only **bold** text becomes a pull line (styled large when it opens the decision). */
const markdownComponents: Components = {
  p: ({ node, ...props }) => {
    const children = node?.children ?? [];
    const onlyBold = children.length === 1 && children[0].type === "element" && children[0].tagName === "strong";
    return <p className={onlyBold ? "pull" : undefined} {...props} />;
  },
};

/** Layout follows mockups/project.html. `number` is the project's place on the home page. */
export function ProjectPage({ project, number, next }: { project: Project; number: number; next?: Project }) {
  const { links, story, visibility } = project;

  return (
    <main id="main">
      <section className="opener project-opener grid" aria-labelledby="project-title">
        <div className="left-7">
          <AllWorkLink />
          <p className="section-no">
            Project {String(number).padStart(2, "0")} · {project.dates}
          </p>
          <h1 id="project-title">{project.title}</h1>
          <p className="project-line">{project.summary}</p>
        </div>
        <div className="right-5 project-why">
          {project.why && (
            <>
              <h2 className="section-no">{project.tier === "in-progress" ? "Why I'm building it" : "Why I made it"}</h2>
              <p>{project.why}</p>
            </>
          )}
          {(links.demo || links.github || links.story) && (
            <p className="links">
              {links.demo && <a href={links.demo}>Try it →</a>}
              {links.github && <a href={links.github}>Code</a>}
              {links.story && <a href={links.story}>Write-up</a>}
            </p>
          )}
          {visibility.code === "private" && (
            <p className="proof">Code is private{visibility.cannot_show && `: ${visibility.cannot_show}`}</p>
          )}
        </div>
      </section>

      <SharedPicture slug={project.slug}>
        {project.video && project.face ? (
          <ProjectVideo src={project.video} poster={project.face} className="wide-shot" />
        ) : (
          <Picture src={project.face} label={project.title} detail={proofLine(project)} className="wide-shot" />
        )}
      </SharedPicture>

      <ul className="project-facts">
        {factsLine(project).map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>

      {story && (
        <div className="project-story">
          {STORY_PARTS.map((part, index) => (
            <section key={part} className={`grid story-${part}`} aria-labelledby={`story-${part}`}>
              <h2 id={`story-${part}`} className="left-3 section-no">
                {String(index + 1).padStart(2, "0")} · {STORY_HEADINGS[part]}
              </h2>
              <div className="mid-7 story-text">
                <ReactMarkdown components={markdownComponents}>{story[part]}</ReactMarkdown>
              </div>
            </section>
          ))}
        </div>
      )}

      {next && (
        <nav className="next-link grid" aria-label="Next project">
          <p className="left-3 section-no">Next project</p>
          <Link className="mid-7" href={`/projects/${next.slug}`}>
            {next.title} →
          </Link>
        </nav>
      )}
      <AllWorkLink className="back-link-foot" />
    </main>
  );
}
