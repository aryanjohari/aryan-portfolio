import Link from "next/link";

import { Epigraph } from "@/components/Epigraph";
import { Picture } from "@/components/Picture";
import { SharedPicture } from "@/components/SharedPicture";
import type { HomeProjects } from "@/lib/home-sections";
import type { Project } from "@/lib/portfolio-schema";
import { proofLine } from "@/lib/project-display";
import type { ProfileEpigraph } from "@/lib/profile-schema";

function TryLinks({ links }: { links: Project["links"] }) {
  if (!links.demo && !links.github) return null;
  return (
    <p className="links">
      {links.demo && <a href={links.demo}>Try it</a>}
      {links.github && <a href={links.github}>Code</a>}
    </p>
  );
}

function number(index: number, project: Project): string {
  return `${String(index + 1).padStart(2, "0")} · ${project.dates}`;
}

/** The archive has no pages of its own, so each title links to its demo or code instead. */
function archiveHref(project: Project): string | undefined {
  return project.links.demo ?? project.links.github;
}

export function WorkSection({ projects, epigraph }: { projects: HomeProjects; epigraph?: ProfileEpigraph }) {
  const { lead, minor, archive } = projects;

  return (
    <section className="work-ed" id="work" aria-labelledby="work-heading">
      <h2 id="work-heading" className="section-no">
        No. 02 · Selected work
      </h2>
      <Epigraph epigraph={epigraph} />

      {lead.map((project, index) => (
        <article key={project.slug} className={`feature grid${index % 2 === 1 ? " flip" : ""}`}>
          <div className="feature-media">
            <SharedPicture slug={project.slug}>
              <Picture src={project.face} label={project.title} detail={proofLine(project)} className="land" />
            </SharedPicture>
          </div>
          <div className="feature-text">
            <p className="number">{number(index, project)}</p>
            <h3>
              <Link href={`/projects/${project.slug}`}>{project.title}</Link>
            </h3>
            <p>{project.summary}</p>
            <TryLinks links={project.links} />
            <p className="proof">{proofLine(project)}</p>
          </div>
        </article>
      ))}

      <div className="minor grid">
        {minor.map((project, index) => (
          <article key={project.slug}>
            <SharedPicture slug={project.slug}>
              <Picture src={project.face} label={project.title} detail={proofLine(project)} className="land" />
            </SharedPicture>
            <p className="number section-no">{number(lead.length + index, project)}</p>
            <h3>
              <Link href={`/projects/${project.slug}`}>{project.title}</Link>
            </h3>
            <p>{project.summary}</p>
            <TryLinks links={project.links} />
            <p className="proof">{proofLine(project)}</p>
          </article>
        ))}

        {archive.length > 0 && (
          <div className="archive">
            <details>
              <summary>Archive ({archive.length})</summary>
              <ul className="proof">
                {archive.map((project) => {
                  const href = archiveHref(project);
                  return (
                    <li key={project.slug}>
                      {href ? <a href={href}>{project.title}</a> : project.title} · {project.dates.slice(-4)}
                    </li>
                  );
                })}
              </ul>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
