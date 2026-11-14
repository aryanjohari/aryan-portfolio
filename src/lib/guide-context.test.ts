import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGuideContext } from "./guide-context";
import type { Project } from "./portfolio-schema";
import type { Profile } from "./profile-schema";

const profile: Profile = {
  name: "Aryan Johari",
  headline: "Developer",
  tagline: "Builds tested tools.",
  pitch: "I build web apps.",
  location: "Auckland",
  work_rights: "Post Study Work Visa",
  links: { email: "a@example.com", github: "https://github.com/a", linkedin: "https://linkedin.com/in/a", cv: "/cv" },
  threads: [{ id: "web", name: "Web", stack: "TypeScript" }],
  experience: [{ role: "SEO Specialist", org: "Specialist Support Services", dates: "Jul 2025 – Jul 2026", highlights: ["Three NZ sites"] }],
  education: [{ degree: "Master's", school: "Unitec", dates: "Feb 2025 – Jul 2026" }],
  certifications: ["AWS Developer"],
  referees: "On request",
};

const prism = {
  slug: "prism",
  title: "Prism",
  summary: "Photo looks in the browser.",
  thread: "web",
  tier: "featured",
  order: 1,
  status: { state: "frozen", as_of: "2026-10-23" },
  role: "Solo",
  dates: "Apr 2026 – Oct 2026",
  stack: ["TypeScript"],
  proves: "Frontend craft",
  proof: ["120 tests"],
  links: { demo: "https://image.arkhives.nz", github: "https://github.com/a/prism" },
  visibility: { code: "public" },
} satisfies Project;

test("builds the guide context from the profile and projects it is given", () => {
  const context = buildGuideContext(profile, [prism], "2026-11-14T00:00:00.000Z");

  assert.match(context.identity, /a@example\.com/);
  assert.equal(context.experience[0].company, "Specialist Support Services");
  assert.deepEqual(context.projects.map((project) => project.slug), ["prism"]);
  assert.deepEqual(context.meta.featuredDemoSlugs, ["prism"]);
});

test("leaves out any field the site does not publish, even if the profile object carries it", () => {
  const withPrivateField = { ...profile, phone: "+64 21 000 0000" } as Profile;
  const context = buildGuideContext(withPrivateField, [prism], "2026-11-14T00:00:00.000Z");

  assert.doesNotMatch(JSON.stringify(context), /000 0000/);
});
