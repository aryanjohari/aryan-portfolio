/**
 * Shapes content for the home page sections (mockups/home-editorial.html).
 * Pure: the page passes in what getProfile() and getProjects() return.
 */

import type { Project } from "./portfolio-schema";
import type { Profile } from "./profile-schema";

/** Featured projects shown large, alternating sides; the rest sit three across. */
const LEAD_COUNT = 2;

export type HomeProjects = { lead: Project[]; minor: Project[]; now: Project[]; archive: Project[] };

export function groupHomeProjects(projects: Project[]): HomeProjects {
  const inTier = (tier: Project["tier"]) =>
    projects.filter((project) => project.tier === tier).sort((a, b) => a.order - b.order);
  const featured = inTier("featured");
  return {
    lead: featured.slice(0, LEAD_COUNT),
    minor: featured.slice(LEAD_COUNT),
    now: inTier("in-progress"),
    archive: inTier("archive"),
  };
}

export type ExperienceRow = { dates: string; title: string; org: string; did: string[]; taught: string };

/** Jobs, then schools, as one list of rows. Only rows with a "taught" line are shown. */
export function experienceRows(profile: Profile): ExperienceRow[] {
  const jobs = profile.experience
    .filter((job) => job.hidden !== true && job.taught !== undefined)
    .map((job) => ({
      dates: job.dates,
      title: job.role,
      org: job.org_note ? `${job.org}, ${job.org_note}` : job.org,
      did: job.highlights,
      taught: job.taught as string,
    }));
  const schools = profile.education
    .filter((school) => school.taught !== undefined)
    .map((school) => ({
      dates: school.dates,
      title: school.degree,
      org: school.school,
      did: school.note ? [school.note] : [],
      taught: school.taught as string,
    }));
  return [...jobs, ...schools];
}
