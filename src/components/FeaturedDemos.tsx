import Link from "next/link";

import type { Project } from "@/lib/projects";

type FeaturedDemosProps = {
  projects: Project[];
};

function displayTitle(project: Project): string {
  if (project.contentStatus === "ok") {
    return project.title;
  }
  return project.slug;
}

function displaySummary(project: Project): string {
  if (project.contentStatus !== "ok") {
    return "yaml not configured";
  }
  return project.summary;
}

export function FeaturedDemos({ projects }: FeaturedDemosProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="featured-demos">
      <h2 className="page-heading">live demos</h2>
      <ul className="featured-demos-list">
        {projects.map((project) => (
          <li key={project.slug} className="featured-demo-row">
            <div className="featured-demo-main">
              <Link
                href={`/projects/${project.slug}`}
                className="featured-demo-title"
              >
                {displayTitle(project)}
              </Link>
              <span className="featured-demo-summary">
                {displaySummary(project)}
              </span>
            </div>
            <Link
              href={`/projects/${project.slug}`}
              className="featured-demo-action"
            >
              try demo
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
