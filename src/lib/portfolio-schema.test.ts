import assert from "node:assert/strict";
import { test } from "node:test";

import { type Project, validateProject, validateProjectIndex, validateProjectSet } from "./portfolio-schema";

function validYaml() {
  return {
    title: "Prism",
    summary: "A browser photo-styling tool.",
    thread: "web",
    tier: "featured",
    order: 1,
    status: { state: "frozen", as_of: new Date("2026-10-23"), note: "v1 finished" },
    role: "Solo",
    dates: "Apr 2026 – Oct 2026",
    stack: ["TypeScript", "React"],
    proves: "Frontend craft",
    proof: ["107 tests"],
    links: { github: "https://github.com/aryanjohari/web-image-editor" },
    visibility: { code: "public" },
    story: { problem: "p", built: "b", decision: "d", learned: "l", next: "n" } as Record<string, string> | undefined,
  };
}

function project(slug: string, overrides: Partial<Project>): Project {
  const result = validateProject(slug, validYaml());
  assert.ok(result.ok);
  return { ...result.project, ...overrides };
}

test("accepts a complete project and stores an unquoted YAML date as YYYY-MM-DD", () => {
  const result = validateProject("prism", validYaml());
  assert.ok(result.ok);
  assert.equal(result.project.slug, "prism");
  assert.equal(result.project.status.as_of, "2026-10-23");
});

test("rejects a tier that is not one of the allowed values", () => {
  const result = validateProject("prism", { ...validYaml(), tier: "highlight" });
  assert.deepEqual(result, { ok: false, message: "prism: tier must be one of: featured, in-progress, archive" });
});

test("requires the full story for featured work but not for archive work", () => {
  const featured = { ...validYaml(), story: { ...validYaml().story, learned: "" } };
  assert.deepEqual(validateProject("prism", featured), {
    ok: false,
    message: "prism: Missing or empty required field: story.learned",
  });

  const archive = { ...validYaml(), tier: "archive", story: undefined };
  assert.equal(validateProject("prism", archive).ok, true);
});

test("rejects a private project that links its code", () => {
  const result = validateProject("gstf", { ...validYaml(), visibility: { code: "private" } });
  assert.deepEqual(result, {
    ok: false,
    message: "gstf: links.github must be left out when visibility.code is private",
  });
});

test("rejects two featured projects that prove the same thing", () => {
  const projects = [project("prism", { order: 1 }), project("pii-gateway", { order: 2, proves: "frontend craft " })];
  assert.deepEqual(validateProjectSet(projects, ["web"]), {
    ok: false,
    message: 'pii-gateway: proves the same thing as prism ("frontend craft ")',
  });
});

test("rejects a project whose thread is not in the profile", () => {
  const result = validateProjectSet([project("prism", { thread: "games" })], ["web", "ai"]);
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.message : "", /thread "games" is not in profile.yaml threads/);
});

test("reads the project index and rejects a slug listed twice", () => {
  assert.deepEqual(validateProjectIndex({ projects: [{ slug: "prism" }] }), {
    ok: true,
    entries: [{ slug: "prism" }],
  });
  assert.deepEqual(validateProjectIndex({ projects: [{ slug: "prism" }, { slug: "prism" }] }), {
    ok: false,
    message: 'projects[1].slug "prism" is listed twice',
  });
});
