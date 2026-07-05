import type { Project } from "@/lib/projects";
import { contentNoticeHeading } from "@/lib/projects";

import { DemoPanel } from "@/components/DemoPanel";

type ProjectSplitProps = {
  project: Project;
};

function StackTags({ stack }: { stack: string[] }) {
  if (stack.length === 0) {
    return <span className="project-meta-value">—</span>;
  }

  return (
    <span className="stack-tags">
      {stack.map((item) => (
        <span key={item} className="stack-tag">
          {item}
        </span>
      ))}
    </span>
  );
}

export function ProjectSplit({ project }: ProjectSplitProps) {
  const hasContent = project.contentStatus === "ok";

  return (
    <div className="project-split">
      <div className="project-narrative">
        <h1 className="project-title">{project.title}</h1>
        <p className="project-status-label">{project.status}</p>

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

        <dl className="project-meta project-meta--yaml">
          <div className="project-meta-row">
            <dt>slug:</dt>
            <dd className="project-meta-value">{project.slug}</dd>
          </div>
          <div className="project-meta-row">
            <dt>status:</dt>
            <dd className="project-meta-value">{project.status}</dd>
          </div>
          <div className="project-meta-row">
            <dt>stack:</dt>
            <dd>
              <StackTags stack={project.stack} />
            </dd>
          </div>
          <div className="project-meta-row">
            <dt>github:</dt>
            <dd className="project-meta-value">
              <a href={project.links.github} target="_blank" rel="noopener noreferrer">
                {project.links.github.replace("https://github.com/", "")}
              </a>
            </dd>
          </div>
          {project.links.docs && (
            <div className="project-meta-row">
              <dt>docs:</dt>
              <dd className="project-meta-value">
                <a href={project.links.docs} target="_blank" rel="noopener noreferrer">
                  {project.links.docs}
                </a>
              </dd>
            </div>
          )}
          {project.links.demo && !project.demo && (
            <div className="project-meta-row">
              <dt>demo:</dt>
              <dd className="project-meta-value">
                <a href={project.links.demo} target="_blank" rel="noopener noreferrer">
                  {project.links.demo}
                </a>
              </dd>
            </div>
          )}
          {project.demo && (
            <div className="project-meta-row">
              <dt>demo:</dt>
              <dd className="project-meta-value">{project.demo.type}</dd>
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
