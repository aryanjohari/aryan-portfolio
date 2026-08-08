import type { Metadata } from "next";

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
        <p className="workshop-lede">Selected projects — drag to browse.</p>
      </header>
      <ProjectGallery projects={projects} />
    </div>
  );
}
