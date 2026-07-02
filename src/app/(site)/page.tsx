import { ProjectTable } from "@/components/ProjectTable";
import { getAllProjects } from "@/lib/projects";

export default function Home() {
  const projects = getAllProjects();

  return (
    <>
      <h1 className="page-heading">workshop index</h1>
      <ProjectTable projects={projects} />
    </>
  );
}
