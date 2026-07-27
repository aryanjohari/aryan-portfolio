import Link from "next/link";

import type { Project } from "@/lib/projects";
import { contentNoticeHeading } from "@/lib/projects";

import { DemoPanel } from "@/components/DemoPanel";
import { ProjectDiagram } from "@/components/ProjectDiagram";
import { ProjectExhibitMotion } from "@/components/ProjectExhibitMotion";

type ProjectExhibitProps = {
  project: Project;
};

type ExhibitBadge = "live demo" | "exhibit" | "research";

function resolveLiveDemoUrl(project: Project): string | undefined {
  if (project.demo?.type === "iframe") {
    return project.demo.url;
  }
  return project.links.demo;
}

function resolveBadge(project: Project): ExhibitBadge {
  if (project.demo?.type === "iframe" || project.links.demo) {
    return "live demo";
  }
  if (project.demo?.type === "exhibit") {
    return "exhibit";
  }
  return "research";
}

/** Full description for the project homepage hero (not a truncated lede). */
function exhibitDescription(project: Project): string {
  const description = project.description.trim();
  if (description) return description;
  return project.summary.trim();
}

function StackTags({ stack }: { stack: string[] }) {
  if (stack.length === 0) {
    return <span className="project-details-empty">—</span>;
  }

  return (
    <ul className="stack-tags" aria-label="Tech stack">
      {stack.map((item) => (
        <li key={item} className="stack-tag" data-exhibit-skill-tag title={item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ProjectExhibit({ project }: ProjectExhibitProps) {
  const hasContent = project.contentStatus === "ok";
  const liveDemoUrl = resolveLiveDemoUrl(project);
  const badge = resolveBadge(project);
  const showExhibitStage = project.demo?.type === "exhibit";

  return (
    <ProjectExhibitMotion>
      <article className="project-exhibit">
        {/* Act 1 — Hero (asymmetric mini-homepage) */}
        <header className="project-exhibit-hero project-exhibit-rail" data-exhibit-act="hero">
          <p className="project-exhibit-badge" data-exhibit-hero-badge>
            {badge}
          </p>
          <h1 className="project-title" data-exhibit-hero-title>
            {project.title}
          </h1>
          <nav
            className="project-exhibit-actions"
            aria-label="Project actions"
            data-exhibit-actions
          >
            {liveDemoUrl && (
              <a
                href={liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-exhibit-action project-exhibit-action--primary"
              >
                Open live demo ↗
              </a>
            )}
            <a
              href={project.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="project-exhibit-action"
            >
              GitHub
            </a>
            {project.links.docs && (
              <a
                href={project.links.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="project-exhibit-action"
              >
                Docs
              </a>
            )}
            <Link href="/workshop" className="project-exhibit-action project-exhibit-action--quiet">
              ← Back to workshop
            </Link>
          </nav>
          <p className="project-exhibit-lede" data-exhibit-hero-lede>
            {exhibitDescription(project)}
          </p>
        </header>

        {/* Act 2 — brief empty void; Atmosphere reads through transparent main */}
        <div className="project-exhibit-void" data-exhibit-void aria-hidden="true" />

        {/* Act 3 — architecture void dive (full-bleed when owned IR) */}
        <ProjectDiagram title={project.title} diagram={project.diagram} />

        {/* Act 4 — quiet rest after unpin */}
        <div className="project-exhibit-rest project-exhibit-rail" data-exhibit-rest>
          {/* Optional exhibit — after architecture so it doesn't steal the path beat */}
          {showExhibitStage && (
            <section className="project-exhibit-stage" aria-label="Exhibit" data-exhibit-act="stage">
              <DemoPanel demo={project.demo} />
            </section>
          )}

          {/* Skills / coda — quiet after the dive */}
          <section
            className="project-exhibit-skills"
            aria-labelledby="project-skills-heading"
            data-exhibit-act="skills"
          >
            <div className="project-exhibit-skills-head" data-exhibit-skills-item>
              <h2 id="project-skills-heading" className="project-exhibit-section-title">
                Stack
              </h2>
              <p className="project-exhibit-skills-status" data-exhibit-skills-item>
                <span className="visually-hidden">Status: </span>
                {project.status}
              </p>
            </div>
            <div data-exhibit-skills-item>
              <StackTags stack={project.stack} />
            </div>
          </section>

          <section
            className="project-exhibit-coda"
            aria-labelledby="project-coda-heading"
            data-exhibit-act="coda"
          >
            <h2 id="project-coda-heading" className="project-exhibit-section-title" data-exhibit-coda-item>
              Details
            </h2>
            {!hasContent && (
              <aside className="content-notice" role="status" data-exhibit-coda-item>
                <p className="content-notice-heading">{contentNoticeHeading(project.contentStatus)}</p>
                {project.contentMessage && (
                  <p className="content-notice-message">{project.contentMessage}</p>
                )}
                <a
                  href={`https://github.com/${project.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="content-notice-link"
                >
                  View repository on GitHub
                </a>
              </aside>
            )}
            <dl className="project-details-list">
              <div className="project-details-row" data-exhibit-coda-item>
                <dt>Status</dt>
                <dd className="project-details-value">{project.status}</dd>
              </div>
              <div className="project-details-row" data-exhibit-coda-item>
                <dt>Repository</dt>
                <dd className="project-details-value">
                  <a href={project.links.github} target="_blank" rel="noopener noreferrer">
                    {project.links.github.replace("https://github.com/", "")}
                  </a>
                </dd>
              </div>
              {project.links.docs && (
                <div className="project-details-row" data-exhibit-coda-item>
                  <dt>Docs</dt>
                  <dd className="project-details-value">
                    <a href={project.links.docs} target="_blank" rel="noopener noreferrer">
                      Documentation
                    </a>
                  </dd>
                </div>
              )}
              {liveDemoUrl && (
                <div className="project-details-row" data-exhibit-coda-item>
                  <dt>Live demo</dt>
                  <dd className="project-details-value">
                    <a href={liveDemoUrl} target="_blank" rel="noopener noreferrer">
                      {liveDemoUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </article>
    </ProjectExhibitMotion>
  );
}
