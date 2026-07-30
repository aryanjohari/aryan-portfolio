import Link from "next/link";

import type { Project } from "@/lib/projects";
import { contentNoticeHeading, getAllProjects } from "@/lib/projects";

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

/**
 * Visual / live demos lead with the demo CTA.
 * Systems / research lead with GitHub (docs next when present).
 */
/** Visual projects lead with demo; systems/research lead with GitHub (+ docs). */
function isVisualProject(liveDemoUrl: string | undefined): boolean {
  return Boolean(liveDemoUrl);
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

/** Project case study shell: hero → strip → architecture → proof → coda. */
export function ProjectExhibit({ project }: ProjectExhibitProps) {
  const hasContent = project.contentStatus === "ok";
  const liveDemoUrl = resolveLiveDemoUrl(project);
  const badge = resolveBadge(project);
  const showProofStage = Boolean(project.demo);
  const visual = isVisualProject(liveDemoUrl);
  const projects = getAllProjects();
  const projectIndex = projects.findIndex((item) => item.slug === project.slug);
  const nextProject =
    projectIndex >= 0 ? projects[(projectIndex + 1) % projects.length] : undefined;

  return (
    <ProjectExhibitMotion>
      <article className="project-exhibit">
        <header
          className="project-exhibit-hero project-exhibit-rail"
          data-exhibit-act="hero"
        >
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
                className={`project-exhibit-action${
                  visual ? " project-exhibit-action--primary" : ""
                }`}
              >
                Open live demo ↗
              </a>
            )}
            <a
              href={project.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className={`project-exhibit-action${
                !visual ? " project-exhibit-action--primary" : ""
              }`}
            >
              GitHub
            </a>
            {project.links.docs && (
              <a
                href={project.links.docs}
                target="_blank"
                rel="noopener noreferrer"
                className={`project-exhibit-action${
                  !visual ? " project-exhibit-action--primary" : ""
                }`}
              >
                Docs
              </a>
            )}
          </nav>
          <p className="project-exhibit-lede" data-exhibit-hero-lede>
            {exhibitDescription(project)}
          </p>
        </header>

        <section className="project-exhibit-strip" aria-label="Project summary">
          <p className="project-exhibit-strip-status">
            <span>Status</span>
            <strong>{project.status}</strong>
          </p>
          <div className="project-exhibit-strip-stack">
            <span className="project-exhibit-strip-label">Stack</span>
            <StackTags stack={project.stack} />
          </div>
          <nav className="project-exhibit-strip-links" aria-label="Key project links">
            {liveDemoUrl ? (
              <a href={liveDemoUrl} target="_blank" rel="noopener noreferrer">
                Demo ↗
              </a>
            ) : null}
            <a href={project.links.github} target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
            {project.links.docs ? (
              <a href={project.links.docs} target="_blank" rel="noopener noreferrer">
                Docs ↗
              </a>
            ) : null}
          </nav>
        </section>

        <div className="project-exhibit-how" data-exhibit-act="how">
          <ProjectDiagram
            title={project.title}
            diagram={project.diagram}
            slug={project.slug}
            githubRepoUrl={project.links.github}
            branch={project.branch}
          />
        </div>

        <div className="project-exhibit-rest" data-exhibit-rest>
          <section
            className={`project-exhibit-proof${showProofStage ? " project-exhibit-proof--stage" : ""}`}
            aria-labelledby="project-proof-heading"
            data-exhibit-act="stage"
          >
            <div className="project-exhibit-proof-heading project-exhibit-rail">
              <h2 id="project-proof-heading" className="project-exhibit-section-title">
                Proof
              </h2>
            </div>

            {!hasContent ? (
              <aside className="content-notice project-exhibit-rail" role="status">
                <p className="content-notice-heading">{contentNoticeHeading(project.contentStatus)}</p>
                {project.contentMessage ? (
                  <p className="content-notice-message">{project.contentMessage}</p>
                ) : null}
                <a
                  href={`https://github.com/${project.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="content-notice-link"
                >
                  View repository on GitHub
                </a>
              </aside>
            ) : null}

            {showProofStage ? (
              <div className="project-exhibit-stage" aria-label="Project proof">
              <DemoPanel demo={project.demo} />
              </div>
            ) : (
              <div className="project-exhibit-proof-note">
                <p className="project-exhibit-proof-kicker">Result</p>
                <p>{project.summary}</p>
              </div>
            )}
          </section>

          <section
            className="project-exhibit-coda project-exhibit-rail"
            aria-labelledby="project-coda-heading"
            data-exhibit-act="coda"
          >
            <h2 id="project-coda-heading" className="project-exhibit-section-title" data-exhibit-coda-item>
              Continue
            </h2>
            <div className="project-exhibit-coda-links">
              <div className="project-exhibit-coda-resources">
                <a href={project.links.github} target="_blank" rel="noopener noreferrer">
                  GitHub ↗
                </a>
                {project.links.docs ? (
                  <a href={project.links.docs} target="_blank" rel="noopener noreferrer">
                    Docs ↗
                  </a>
                ) : null}
              </div>
              <nav className="project-exhibit-coda-nav" aria-label="Project navigation">
                <Link href="/workshop">← Back to workshop</Link>
                {nextProject && nextProject.slug !== project.slug ? (
                  <Link href={`/projects/${nextProject.slug}`}>
                    Next: {nextProject.title} →
                  </Link>
                ) : null}
              </nav>
            </div>
          </section>
        </div>
      </article>
    </ProjectExhibitMotion>
  );
}
