import { ExperienceSection } from "@/components/ExperienceSection";
import { HomeHero } from "@/components/HomeHero";
import { NowBand } from "@/components/NowBand";
import { WorkSection } from "@/components/WorkSection";
import { experienceRows, groupHomeProjects } from "@/lib/home-sections";
import { getProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";
import { getHomeText } from "@/lib/site-text-files";

/** Layout follows mockups/home-editorial.html. */
export default function Home() {
  const profile = getProfile();
  const projects = groupHomeProjects(getProjects());
  const epigraph = (section: "work" | "experience") => profile.epigraphs?.find((item) => item.section === section);

  return (
    <main id="main" className="home">
      <HomeHero profile={profile} text={getHomeText()} />
      <WorkSection projects={projects} epigraph={epigraph("work")} />
      <ExperienceSection rows={experienceRows(profile)} epigraph={epigraph("experience")} />
      <NowBand projects={projects.now} />
    </main>
  );
}
