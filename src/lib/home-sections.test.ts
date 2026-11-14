import assert from "node:assert/strict";
import { test } from "node:test";

import { experienceRows, groupHomeProjects } from "./home-sections";
import type { Project, ProjectTier } from "./portfolio-schema";
import type { Profile } from "./profile-schema";

function project(slug: string, tier: ProjectTier, order: number): Project {
  return {
    slug,
    title: slug,
    summary: "One line.",
    thread: "web",
    tier,
    order,
    status: { state: "live", as_of: "2026-11-14" },
    role: "Solo",
    dates: "Mar 2026 – Oct 2026",
    stack: ["TypeScript"],
    proves: "Something",
    proof: ["CI"],
    links: {},
    visibility: { code: "public" },
  };
}

test("groups projects: the first two featured are large, the rest small, then now and archive", () => {
  const groups = groupHomeProjects([
    project("c", "featured", 3),
    project("old", "archive", 1),
    project("a", "featured", 1),
    project("wip", "in-progress", 1),
    project("b", "featured", 2),
  ]);
  const slugs = (list: Project[]) => list.map((item) => item.slug);

  assert.deepEqual(slugs(groups.lead), ["a", "b"]);
  assert.deepEqual(slugs(groups.minor), ["c"]);
  assert.deepEqual(slugs(groups.now), ["wip"]);
  assert.deepEqual(slugs(groups.archive), ["old"]);
});

const profile = {
  experience: [
    { role: "Volunteer", org: "Hidden Co", dates: "Oct 2026 – present", highlights: ["Secret"], hidden: true },
    {
      role: "Junior Website Developer",
      org: "KRIL Digital",
      org_note: "Mumbai",
      dates: "May 2024 – Oct 2024",
      highlights: ["About 20 client sites."],
      taught: "Marketing",
    },
  ],
  education: [
    { degree: "Master's", school: "Unitec", dates: "Feb 2025 – Jul 2026", note: "Thesis", taught: "AI research" },
    { degree: "BSc", school: "Thakur College", dates: "Sep 2021 – Apr 2024" },
  ],
} as Pick<Profile, "experience" | "education"> as Profile;

test("experience rows leave out hidden jobs and schools with nothing they taught", () => {
  assert.deepEqual(experienceRows(profile), [
    {
      dates: "May 2024 – Oct 2024",
      title: "Junior Website Developer",
      org: "KRIL Digital, Mumbai",
      did: ["About 20 client sites."],
      taught: "Marketing",
    },
    { dates: "Feb 2025 – Jul 2026", title: "Master's", org: "Unitec", did: ["Thesis"], taught: "AI research" },
  ]);
});
