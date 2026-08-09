import Link from "next/link";

import type { Project } from "@/lib/projects";
import { contentNoticeHeading, getAllProjects } from "@/lib/projects";

import { DemoPanel } from "@/components/DemoPanel";
import {
  hasArchitectureSurface,
  ProjectDiagram,
} from "@/components/ProjectDiagram";
import { ProjectExhibitMotion } from "@/components/ProjectExhibitMotion";

type ProjectExhibitProps = {
  project: Project;
};

type ExhibitBadge = "live demo" | "exhibit" | "research";
type PrimaryChapter = "demo" | "architecture";

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

/** Visual projects have a live demo URL; systems/research do not. */
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

function ProofChapter({
  project,
  hasContent,
  secondary,
}: {
  project: Project;
  hasContent: boolean;
  secondary?: boolean;
}) {
  const showStage = Boolean(project.demo);

  return (
    <section
      className={[
        "project-exhibit-proof project-exhibit-chapter",
        showStage ? "project-exhibit-proof--stage" : "",
        secondary ? "project-exhibit-chapter--secondary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
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

      {showStage ? (
        <div className="project-exhibit-stage" aria-label="Project proof">
          <DemoPanel demo={project.demo} />
        </div>
      ) : null}
    </section>
  );
}

function ArchitectureChapter({
  project,
  secondary,
}: {
  project: Project;
  secondary?: boolean;
}) {
  return (
    <div
      className={[
        "project-exhibit-how project-exhibit-chapter",
        secondary ? "project-exhibit-chapter--secondary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-exhibit-act="how"
    >
      <ProjectDiagram
        title={project.title}
        diagram={project.diagram}
        slug={project.slug}
        githubRepoUrl={project.links.github}
        branch={project.branch}
      />
    </div>
  );
}

/** Project case study: hero → stack → primary middle → optional secondary → continue. */
export function ProjectExhibit({ project }: ProjectExhibitProps) {
  const hasContent = project.contentStatus === "ok";
  const liveDemoUrl = resolveLiveDemoUrl(project);
  const badge = resolveBadge(project);
  const visual = isVisualProject(liveDemoUrl);
  const hasArchitecture = hasArchitectureSurface(project.diagram);
  const showProof = Boolean(project.demo);
  const primaryChapter: PrimaryChapter = visual ? "demo" : "architecture";
  const projects = getAllProjects();
  const projectIndex = projects.findIndex((item) => item.slug === project.slug);
  const nextProject =
    projectIndex >= 0 ? projects[(projectIndex + 1) % projects.length] : undefined;

  const proofChapter =
    showProof ? (
      <ProofChapter
        key="proof"
        project={project}
        hasContent={hasContent}
        secondary={primaryChapter !== "demo"}
      />
    ) : null;

  const architectureChapter = hasArchitecture ? (
    <ArchitectureChapter
      key="architecture"
      project={project}
      secondary={primaryChapter !== "architecture"}
    />
  ) : null;

  const middleChapters =
    primaryChapter === "demo"
      ? [proofChapter, architectureChapter]
      : [architectureChapter, proofChapter];

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
            {liveDemoUrl ? (
              <a
                href={liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`project-exhibit-action${
                  visual ? " project-exhibit-action--primary" : " project-exhibit-action--quiet"
                }`}
              >
                Open live demo ↗
              </a>
            ) : null}
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
            {project.links.docs ? (
              <a
                href={project.links.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="project-exhibit-action project-exhibit-action--quiet"
              >
                Docs
              </a>
            ) : null}
          </nav>
          <p className="project-exhibit-lede" data-exhibit-hero-lede>
            {exhibitDescription(project)}
          </p>
        </header>

        <section
          className="project-exhibit-stack project-exhibit-rail"
          aria-label="Stack and status"
        >
          <p className="project-exhibit-stack-status">
            <span className="visually-hidden">Status</span>
            {project.status}
          </p>
          <div className="project-exhibit-stack-glyphs">
            <StackTags stack={project.stack} />
          </div>
        </section>

        <div className="project-exhibit-rest" data-exhibit-rest>
          {middleChapters}

          {!hasContent && !showProof ? (
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

          <section
            className="project-exhibit-coda project-exhibit-rail"
            aria-labelledby="project-coda-heading"
            data-exhibit-act="coda"
          >
            <h2 id="project-coda-heading" className="project-exhibit-section-title" data-exhibit-coda-item>
              Continue
            </h2>
            <nav className="project-exhibit-coda-nav" aria-label="Project navigation">
              <Link href="/projects">← Back to projects</Link>
              {nextProject && nextProject.slug !== project.slug ? (
                <Link href={`/projects/${nextProject.slug}`}>
                  Next: {nextProject.title} →
                </Link>
              ) : null}
            </nav>
          </section>
        </div>
      </article>
    </ProjectExhibitMotion>
  );
}
