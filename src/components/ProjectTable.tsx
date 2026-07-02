import Link from "next/link";

import type { Project } from "@/lib/projects";

type ProjectTableProps = {
  projects: Project[];
};

function indexSummary(project: Project): string {
  if (project.contentStatus !== "ok") {
    return "yaml not configured";
  }
  return project.summary;
}

export function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <div className="table-wrap">
      <table className="project-table">
        <thead>
          <tr>
            <th scope="col">name</th>
            <th scope="col">stack</th>
            <th scope="col">status</th>
            <th scope="col">demo</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.slug}>
              <td>
                <Link href={`/projects/${project.slug}`} className="project-link">
                  {project.slug}
                </Link>
                <span
                  className={
                    project.contentStatus !== "ok"
                      ? "project-summary project-summary--missing"
                      : "project-summary"
                  }
                >
                  {indexSummary(project)}
                </span>
              </td>
              <td className="project-stack">
                {project.stack.length > 0 ? project.stack.join(", ") : "—"}
              </td>
              <td className="project-status">
                {project.status}
                {project.contentStatus !== "ok" && (
                  <span
                    className="content-warn"
                    title={project.contentMessage ?? "portfolio.yaml issue"}
                    aria-label={`Content warning: ${project.contentMessage ?? "portfolio.yaml issue"}`}
                  >
                    ⚠
                  </span>
                )}
              </td>
              <td className="project-demo">
                {project.demo ? (
                  <Link href={`/projects/${project.slug}`}>try demo</Link>
                ) : (
                  <span className="demo-empty" aria-label="No demo available">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
