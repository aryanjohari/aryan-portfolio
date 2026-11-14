import assert from "node:assert/strict";
import { test } from "node:test";

import type { Project, ProjectTier } from "./portfolio-schema";
import { factsLine, nextProject } from "./project-display";

function project(slug: string, tier: ProjectTier, order: number, hasStory = true): Project {
  return {
    slug,
    title: slug,
    summary: "One line.",
    thread: "web",
    tier,
    order,
    status: { state: "frozen", as_of: "2026-10-23", note: "v1 finished" },
    role: "Solo",
    dates: "Apr 2026 – Oct 2026",
    stack: ["TypeScript", "React", "WebGL2", "Vitest"],
    proves: "Frontend craft",
    proof: ["120 tests", "CI: lint, tests and build"],
    links: {},
    visibility: { code: "public" },
    ...(hasStory && { story: { problem: "p", built: "b", decision: "d", learned: "l", limits: "x", next: "n" } }),
  };
}

test("facts line: role, the first three stack items, every proof, then the state", () => {
  assert.deepEqual(factsLine(project("prism", "featured", 1)), [
    "Solo",
    "TypeScript, React, WebGL2",
    "120 tests",
    "CI: lint, tests and build",
    "Finished",
  ]);
});

test("next project follows the home page order, skips pages that don't exist, and wraps around", () => {
  const projects = [
    project("a", "featured", 1),
    project("b", "featured", 2),
    project("wip", "in-progress", 1),
    project("old", "archive", 1, false),
  ];
  assert.equal(nextProject(projects, "a")?.slug, "b");
  assert.equal(nextProject(projects, "b")?.slug, "wip");
  assert.equal(nextProject(projects, "wip")?.slug, "a");
  assert.equal(nextProject([project("a", "featured", 1)], "a"), undefined);
});
