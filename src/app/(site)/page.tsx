import { HomeIntro } from "@/components/HomeIntro";
import { PortfolioGuide } from "@/components/PortfolioGuide";
import guideContext from "@/lib/guide-context.json";
import type { GuideContextFile } from "@/lib/guide-schema";
import { getAllProjects } from "@/lib/projects";

const context = guideContext as GuideContextFile;

export default function Home() {
  const projects = getAllProjects();

  return (
    <>
      <HomeIntro variant="home" projectCount={projects.length} />
      <PortfolioGuide suggestedPrompts={context.suggestedPrompts} />
    </>
  );
}
