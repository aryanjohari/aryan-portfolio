import Link from "next/link";

import type { Project } from "@/lib/projects";
import { contentNoticeHeading } from "@/lib/projects";

import { DemoPanel } from "@/components/DemoPanel";
import { ProjectDiagram } from "@/components/ProjectDiagram";

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

/** Prefer a distinct first sentence from description; fall back to summary. */
function exhibitSentence(project: Project): string {
  const description = project.description.trim();
  const summary = project.summary.trim();

  const match = description.match(/^(.+?[.!?])(?:\s|$)/);
  const first = match?.[1]?.trim();

  if (first && first !== summary && first.length >= 24) {
    return first;
  }

  if (description && description !== summary) {
    // Cap long descriptions for the hero line
    if (description.length > 180) {
      const cut = description.slice(0, 177).replace(/\s+\S*$/, "");
      return `${cut}…`;
    }
    return description;
  }

  return summary;
}

function StackTags({ stack }: { stack: string[] }) {
  if (stack.length === 0) {
    return <span className="project-details-empty">—</span>;
  }

  return (
    <ul className="stack-tags" aria-label="Tech stack">
      {stack.map((item) => (
        <li key={item} className="stack-tag" title={item}>
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
    <article className="project-exhibit">
      <header className="project-exhibit-hero">
        <p className="project-exhibit-badge">{badge}</p>
        <h1 className="project-title">{project.title}</h1>
        <p className="project-exhibit-lede">{exhibitSentence(project)}</p>
      </header>

      <nav className="project-exhibit-actions" aria-label="Project actions">
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

      {showExhibitStage && (
        <section className="project-exhibit-stage" aria-label="Exhibit">
          <DemoPanel demo={project.demo} />
        </section>
      )}

      <section className="project-exhibit-story" aria-labelledby="project-story-heading">
        <h2 id="project-story-heading" className="project-exhibit-section-title">
          Story
        </h2>
        {!hasContent && (
          <aside className="content-notice" role="status">
            <p className="content-notice-heading">{contentNoticeHeading(project.contentStatus)}</p>
            {project.contentMessage && (
              <p className="content-notice-message">{project.contentMessage}</p>
            )}
            <p className="content-notice-body">{project.description}</p>
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
        {hasContent && <p className="project-description">{project.description}</p>}
      </section>

      <ProjectDiagram title={project.title} diagram={project.diagram} />

      <section className="project-exhibit-details" aria-labelledby="project-details-heading">
        <h2 id="project-details-heading" className="project-exhibit-section-title">
          Details
        </h2>
        <dl className="project-details-list">
          <div className="project-details-row">
            <dt>Status</dt>
            <dd className="project-details-value">{project.status}</dd>
          </div>
          <div className="project-details-row">
            <dt>Stack</dt>
            <dd>
              <StackTags stack={project.stack} />
            </dd>
          </div>
          <div className="project-details-row">
            <dt>Repository</dt>
            <dd className="project-details-value">
              <a href={project.links.github} target="_blank" rel="noopener noreferrer">
                {project.links.github.replace("https://github.com/", "")}
              </a>
            </dd>
          </div>
          {project.links.docs && (
            <div className="project-details-row">
              <dt>Docs</dt>
              <dd className="project-details-value">
                <a href={project.links.docs} target="_blank" rel="noopener noreferrer">
                  Documentation
                </a>
              </dd>
            </div>
          )}
          {liveDemoUrl && (
            <div className="project-details-row">
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
    </article>
  );
}
