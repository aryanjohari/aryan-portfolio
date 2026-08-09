import Link from "next/link";

import type { Project } from "@/lib/projects";
import { getAllProjects } from "@/lib/projects";
import { exhibitCaseBeats } from "@/lib/exhibit-case";

import { ExhibitSurfaces } from "@/components/ExhibitSurfaceInvites";
import { hasArchitectureSurface } from "@/components/ProjectDiagram";
import { ProjectExhibitMotion } from "@/components/ProjectExhibitMotion";
import { StackMarquee } from "@/components/StackMarquee";
import {
  EXHIBIT_VOID_SCROLL_BLOCKS,
  VoidScrollDrama,
} from "@/components/VoidScrollDrama";

type ProjectExhibitProps = {
  project: Project;
};

function resolveLiveDemoUrl(project: Project): string | undefined {
  if (project.demo?.type === "iframe") {
    return project.demo.url;
  }
  return project.links.demo;
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

/** Project case study: hero → stack belt → lite beats → stage → continue. */
export function ProjectExhibit({ project }: ProjectExhibitProps) {
  const hasContent = project.contentStatus === "ok";
  const liveDemoUrl = resolveLiveDemoUrl(project);
  const visual = isVisualProject(liveDemoUrl);
  const hasArchitecture = hasArchitectureSurface(project.diagram);
  const showProof = Boolean(project.demo);
  const primary =
    visual && showProof
      ? "proof"
      : hasArchitecture
        ? "architecture"
        : "proof";
  const projects = getAllProjects();
  const projectIndex = projects.findIndex((item) => item.slug === project.slug);
  const nextProject =
    projectIndex >= 0
      ? projects[(projectIndex + 1) % projects.length]
      : undefined;
  const caseBeats = exhibitCaseBeats(project);

  return (
    <ProjectExhibitMotion>
      <VoidScrollDrama blocks={EXHIBIT_VOID_SCROLL_BLOCKS} />
      <article className="project-exhibit">
        <header
          className="project-exhibit-hero project-exhibit-rail"
          data-exhibit-act="hero"
        >
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
                  visual
                    ? " project-exhibit-action--primary"
                    : " project-exhibit-action--quiet"
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
          aria-label="Stack"
        >
          <div className="project-exhibit-stack-glyphs">
            <StackMarquee stack={project.stack} />
          </div>
        </section>

        <div className="project-exhibit-rest" data-exhibit-rest>
          <section
            className="project-exhibit-case project-exhibit-rail"
            aria-labelledby="project-case-heading"
            data-exhibit-act="case"
          >
            <p className="project-exhibit-case-kicker">Case study</p>
            <h2
              id="project-case-heading"
              className="project-exhibit-section-title"
            >
              In brief
            </h2>
            <ol className="project-exhibit-case-grid">
              {caseBeats.map((beat) => (
                <li key={beat.label} className="project-exhibit-case-beat">
                  <h3 className="project-exhibit-case-label">{beat.label}</h3>
                  <p className="project-exhibit-case-body">{beat.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <ExhibitSurfaces
            project={project}
            primary={primary}
            hasContent={hasContent}
            showProof={showProof}
            hasArchitecture={hasArchitecture}
          />

          <section
            className="project-exhibit-coda project-exhibit-rail"
            aria-labelledby="project-coda-heading"
            data-exhibit-act="coda"
          >
            <h2
              id="project-coda-heading"
              className="project-exhibit-section-title"
              data-exhibit-coda-item
            >
              Continue
            </h2>
            <nav
              className="project-exhibit-coda-nav"
              aria-label="Project navigation"
            >
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
