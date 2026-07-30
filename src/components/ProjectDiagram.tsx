import { ArchitectureJourney } from "@/components/ArchitectureJourney";
import { buildBaseDiagramSvg } from "@/data/base-diagram";
import type { ProjectDiagramData } from "@/lib/projects";

type ProjectDiagramProps = {
  title: string;
  diagram: ProjectDiagramData;
  slug?: string;
  /** Full GitHub repo URL for Dive doc links. */
  githubRepoUrl: string;
  /** Repo branch for GitHub doc links. */
  branch?: string;
};

function sourceCopy(diagram: ProjectDiagramData): string {
  if (diagram.graph) {
    if (diagram.graphSource === "github" && diagram.graphPath) {
      return `Owned architecture map from ${diagram.graphPath}`;
    }
    if (diagram.graphPath) {
      return `Owned architecture map (${diagram.graphPath})`;
    }
    return "Owned architecture map";
  }

  if (diagram.source === "github" && diagram.path) {
    return `Generic system path — architecture source available at ${diagram.path}`;
  }
  return "Generic system path — replace with a repository architecture graph";
}

/**
 * Prefer the owned architecture IR. Until every repository provides it, render
 * a small static Input → Core → Output fallback with no walkthrough theatre.
 */
export function ProjectDiagram({
  title,
  diagram,
  slug,
  githubRepoUrl,
  branch,
}: ProjectDiagramProps) {
  if (diagram.graph) {
    return (
      <ArchitectureJourney
        title={title}
        graph={diagram.graph}
        sourceNote={sourceCopy(diagram)}
        slug={slug}
        c4={diagram.c4}
        githubRepoUrl={githubRepoUrl}
        branch={branch}
      />
    );
  }

  return (
    <section
      className="project-diagram-section"
      aria-labelledby="base-architecture-heading"
      data-exhibit-act="diagram"
      data-diagram-mode="base"
    >
      <div className="project-walk-header">
        <h2 id="base-architecture-heading" className="project-exhibit-section-title">
          How it works
        </h2>
        <p className="project-diagram-source">{sourceCopy(diagram)}</p>
      </div>
      <div
        className="project-diagram project-diagram--static"
        dangerouslySetInnerHTML={{ __html: buildBaseDiagramSvg(title) }}
      />
    </section>
  );
}
