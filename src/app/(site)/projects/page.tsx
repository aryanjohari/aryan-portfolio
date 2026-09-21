import type { Metadata } from "next";
import Link from "next/link";

import { ProjectGallery } from "@/components/ProjectGallery";
import { getAllProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects — Aryan Johari",
  description: "Full catalog of curated portfolio projects.",
};

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div className="workshop-page">
      <header className="workshop-intro">
        <h1 className="page-heading">projects</h1>
        <p className="workshop-lede">Five selected projects.</p>
        {projects.length > 0 ? (
          <ul className="workshop-index">
            {projects.map((project, index) => (
              <li key={project.slug}>
                {index > 0 ? (
                  <span className="workshop-index-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <Link href={`/projects/${project.slug}`}>{project.title}</Link>
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <ProjectGallery projects={projects} />
    </div>
  );
}
