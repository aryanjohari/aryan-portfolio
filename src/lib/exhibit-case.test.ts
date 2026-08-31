/**
 * Minimal node assert tests — run with: tsx src/lib/exhibit-case.test.ts
 */
import assert from "node:assert/strict";

import caseStudies from "../../content/project-case-studies.json";
import { registry } from "@/data/registry";
import {
  exhibitCaseBeats,
  hasAuthoredCaseStudy,
} from "@/lib/exhibit-case";
import type { Project } from "@/lib/projects";
import { validateCaseStudiesFile } from "@/lib/case-study-schema";

const registrySlugs = registry.map((entry) => entry.slug);

function stubProject(overrides: Partial<Project> = {}): Project {
  return {
    slug: "unknown-future-project",
    repo: "aryanjohari/example",
    branch: "main",
    contentStatus: "ok",
    title: "Example",
    summary: "Teams need a faster way to ship hero backgrounds.",
    description:
      "Teams need a faster way to ship hero backgrounds. Built a WebGL compositor with preset export. Shipped preset JSON and live demos.",
    stack: ["TypeScript", "React"],
    status: "active",
    links: {},
    diagram: { source: "base" },
    ...overrides,
  };
}

// All registry slugs have authored studies
const fileResult = validateCaseStudiesFile(caseStudies, registrySlugs);
assert.equal(fileResult.ok, true, "case studies file should validate");

for (const slug of registrySlugs) {
  assert.equal(
    hasAuthoredCaseStudy(slug),
    true,
    `${slug} should have an authored study`,
  );
}

// Authored slug returns exact copy (no clipping)
const adaBeats = exhibitCaseBeats(stubProject({ slug: "ada" }));
assert.equal(adaBeats.length, 3);
assert.equal(adaBeats[0]?.label, "Problem");
assert.equal(
  adaBeats[0]?.body,
  caseStudies.studies.ada.problem.trim(),
  "authored problem beat should match JSON exactly",
);
assert.equal(
  adaBeats[1]?.body,
  caseStudies.studies.ada.approach.trim(),
);
assert.equal(
  adaBeats[2]?.body,
  caseStudies.studies.ada.outcome.trim(),
);
assert.doesNotMatch(adaBeats[0]?.body ?? "", /…$/);

// Unknown slug falls back to heuristic with clipping
const fallback = exhibitCaseBeats(stubProject());
assert.equal(hasAuthoredCaseStudy("unknown-future-project"), false);
assert.equal(fallback[0]?.label, "Problem");
assert.equal(fallback[0]?.body, stubProject().summary);

console.log("exhibit-case tests passed");
