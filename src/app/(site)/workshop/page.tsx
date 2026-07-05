import type { Metadata } from "next";

import { ProjectTable } from "@/components/ProjectTable";
import { getAllProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Workshop — Aryan Johari",
  description: "Full catalog of curated portfolio projects.",
};

export default function WorkshopPage() {
  const projects = getAllProjects();

  return (
    <>
      <h1 className="page-heading">workshop index</h1>
      <ProjectTable projects={projects} />
    </>
  );
}
