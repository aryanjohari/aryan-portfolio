import Link from "next/link";

import type { Project } from "@/lib/projects";

type ProjectTableProps = {
  projects: Project[];
};

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
                <span className="project-summary">{project.summary}</span>
              </td>
              <td className="project-stack">{project.stack.join(", ")}</td>
              <td className="project-status">{project.status}</td>
              <td className="project-demo">
                {project.demo ? (
                  <Link href={`/projects/${project.slug}`}>try demo</Link>
                ) : (
                  <span className="demo-empty" aria-label="No demo available">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
