import assert from "node:assert/strict";
import { test } from "node:test";

import type { Project } from "../portfolio-schema";
import type { Profile } from "../profile-schema";
import { buildAskSections, type AskContent } from "./sections";

const profile = {
  name: "Aryan Johari",
  headline: "Junior Software Developer",
  tagline: "Builds tested tools.",
  pitch: "I build web apps.",
  location: "Auckland, New Zealand",
  work_rights: "Post Study Work Visa",
  links: { email: "a@example.com", github: "https://github.com/a", linkedin: "https://linkedin.com/in/a", cv: "/cv" },
  threads: [{ id: "web", name: "Web", stack: "TypeScript" }],
  experience: [
    { role: "Volunteer", org: "Hidden Co", dates: "Oct 2026 – present", highlights: ["Secret work"], hidden: true },
    { role: "Junior Website Developer", org: "KRIL Digital", org_note: "Mumbai", dates: "May 2024 – Oct 2024", highlights: ["About 20 client sites."], taught: "Marketing" },
  ],
  education: [{ degree: "Master's", school: "Unitec", dates: "Feb 2025 – Jul 2026", note: "Thesis (A-)" }],
  certifications: ["AWS Developer"],
  referees: "On request",
  // Not part of the Profile type, as if someone added it to profile.yaml by mistake.
  phone: "+64 21 123 4567",
} as Profile;

const prism: Project = {
  slug: "prism",
  title: "Prism",
  summary: "Photo looks in the browser.",
  why: "I wanted to learn WebGL.",
  thread: "web",
  tier: "featured",
  order: 1,
  status: { state: "frozen", as_of: "2026-10-23", note: "v1 finished" },
  role: "Solo",
  dates: "Apr 2026 – Oct 2026",
  stack: ["TypeScript", "WebGL2"],
  proves: "Frontend craft",
  proof: ["120 tests"],
  links: { demo: "https://image.example.nz", github: "https://github.com/a/prism" },
  visibility: { code: "public" },
  story: { problem: "p", built: "b", decision: "**No generated pixels.**", learned: "l", limits: "x", next: "n" },
};

const archived: Project = { ...prism, slug: "tahi-pulse", title: "Tahi Pulse", tier: "archive", story: undefined };

const content: AskContent = {
  profile,
  projects: [prism, archived],
  home: { headline: "I build software.", bio: "Short bio." },
  story: { title: "From Notepad", summary: "One line.", chapters: [{ title: "Notepad, my uncle's PC", label: "Where it started", body: "It started here." }] },
  askPage: { title: "How it works", summary: "One line.", chapters: [{ title: "What it can see", body: "Public text only." }] },
};

test("gives every section a stable, unique id and a link to the page it came from", () => {
  const sections = buildAskSections(content);
  const byId = new Map(sections.map((section) => [section.id, section]));

  assert.equal(byId.size, sections.length);
  assert.equal(byId.get("prism#decision")?.url, "/projects/prism#story-decision");
  assert.equal(byId.get("prism#decision")?.title, "Prism · The key decision");
  assert.equal(byId.get("prism#overview")?.url, "/projects/prism");
  assert.equal(byId.get("story#notepad-my-uncles-pc")?.url, "/story");
  assert.equal(byId.get("profile#job-kril-digital")?.url, "/#experience");
  assert.equal(byId.get("ask#what-it-can-see")?.url, "/ask/how-it-works");
  // Archive projects have no page, so their overview points at the work list.
  assert.equal(byId.get("tahi-pulse#overview")?.url, "/#work");
  assert.equal(byId.has("tahi-pulse#decision"), false);
});

test("puts the facts a visitor asks about into the project overview", () => {
  const overview = buildAskSections(content).find((section) => section.id === "prism#overview");
  assert.ok(overview);
  for (const fact of ["Photo looks in the browser.", "I wanted to learn WebGL.", "Apr 2026 – Oct 2026", "120 tests", "https://image.example.nz"]) {
    assert.ok(overview.text.includes(fact), `missing: ${fact}`);
  }
});

test("leaves out hidden jobs and anything that isn't a named public field", () => {
  const allText = buildAskSections(content).map((section) => section.text).join("\n");
  assert.ok(!allText.includes("Hidden Co"));
  assert.ok(!allText.includes("123 4567"));
});
