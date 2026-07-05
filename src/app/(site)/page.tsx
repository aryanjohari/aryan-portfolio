import { FeaturedDemos } from "@/components/FeaturedDemos";
import { HomeIntro } from "@/components/HomeIntro";
import { ProjectTable } from "@/components/ProjectTable";
import { getAllProjects, getFeaturedProjects } from "@/lib/projects";

export default function Home() {
  const projects = getAllProjects();
  const featured = getFeaturedProjects();

  return (
    <>
      <HomeIntro
        projectCount={projects.length}
        featuredCount={featured.length}
      />
      <FeaturedDemos projects={featured} />
      <h1 className="page-heading">workshop index</h1>
      <ProjectTable projects={projects} />
    </>
  );
}
