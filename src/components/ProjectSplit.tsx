import type { Project } from "@/lib/projects";

import { DemoPanel } from "@/components/DemoPanel";

type ProjectSplitProps = {
  project: Project;
};

export function ProjectSplit({ project }: ProjectSplitProps) {
  return (
    <div className="project-split">
      <div className="project-narrative">
        <h1 className="project-title">{project.title}</h1>
        <p className="project-status-label">{project.status}</p>
        <p className="project-description">{project.description}</p>

        <dl className="project-meta">
          <div className="project-meta-row">
            <dt>stack</dt>
            <dd>{project.stack.join(", ")}</dd>
          </div>
          <div className="project-meta-row">
            <dt>github</dt>
            <dd>
              <a href={project.links.github} target="_blank" rel="noopener noreferrer">
                {project.links.github.replace("https://github.com/", "")}
              </a>
            </dd>
          </div>
          {project.links.docs && (
            <div className="project-meta-row">
              <dt>docs</dt>
              <dd>
                <a href={project.links.docs} target="_blank" rel="noopener noreferrer">
                  documentation
                </a>
              </dd>
            </div>
          )}
          {project.links.demo && !project.demo && (
            <div className="project-meta-row">
              <dt>demo</dt>
              <dd>
                <a href={project.links.demo} target="_blank" rel="noopener noreferrer">
                  external link
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="project-demo-column">
        <DemoPanel demo={project.demo} />
      </div>
    </div>
  );
}
