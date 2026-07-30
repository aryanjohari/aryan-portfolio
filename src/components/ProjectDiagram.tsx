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

function hasC4Surface(diagram: ProjectDiagramData): boolean {
  const c4 = diagram.c4;
  return Boolean(
    c4?.context?.mermaid ||
      c4?.context?.markdown ||
      c4?.containers?.mermaid ||
      c4?.containers?.markdown,
  );
}

function sourceCopy(diagram: ProjectDiagramData): string {
  if (hasC4Surface(diagram)) {
    const parts: string[] = [];
    if (diagram.c4?.context) parts.push("Context");
    if (diagram.c4?.containers) parts.push("Containers");
    if (Object.keys(diagram.c4?.components ?? {}).length > 0) parts.push("Components");
    const map = diagram.c4?.mapPath ? ` (${diagram.c4.mapPath})` : "";
    return `C4 architecture — ${parts.join(" → ")}${map}`;
  }

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
 * Prefer C4 Context/Containers when present; otherwise owned graph IR;
 * otherwise a static Input → Core → Output fallback.
 */
export function ProjectDiagram({
  title,
  diagram,
  slug,
  githubRepoUrl,
  branch,
}: ProjectDiagramProps) {
  if (hasC4Surface(diagram) || diagram.graph) {
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
