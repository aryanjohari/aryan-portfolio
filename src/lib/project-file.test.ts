import assert from "node:assert/strict";
import { test } from "node:test";

import { parseProjectFile } from "./project-file";

const FRONTMATTER = `---
title: Prism
summary: A browser photo-styling tool.
thread: web
tier: featured
order: 1
status: { state: frozen, as_of: 2026-10-23 }
role: Solo
dates: Apr 2026 – Oct 2026
stack: [TypeScript]
proves: Frontend craft
proof: ["120 tests"]
links: { github: "https://github.com/aryanjohari/web-image-editor" }
visibility: { code: public }
---
`;

const STORY = `
## The problem

Looks that come out the same every time.

## What I built

A recipe editor.

Two paragraphs here.

## The key decision

No generated pixels.

## What I learned

Write the spec first.

## What's next

Frozen.
`;

test("reads facts from the frontmatter and the story from ## sections", () => {
  const result = parseProjectFile("prism", FRONTMATTER + STORY);
  assert.ok(result.ok);
  assert.equal(result.project.title, "Prism");
  assert.equal(result.project.story?.built, "A recipe editor.\n\nTwo paragraphs here.");
  assert.equal(result.project.story?.next, "Frozen.");
});

test("rejects a file with no frontmatter block", () => {
  assert.deepEqual(parseProjectFile("prism", STORY), {
    ok: false,
    message: "prism: File must start with a --- frontmatter block that ends with ---",
  });
});

test("rejects a story heading it does not know, instead of dropping that text", () => {
  const result = parseProjectFile("prism", FRONTMATTER + STORY.replace("## What I learned", "## Lessons"));
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.message : "", /Unknown story heading "## Lessons"/);
});

test("still applies the project rules, e.g. a featured project needs every story part", () => {
  const result = parseProjectFile("prism", FRONTMATTER + STORY.replace(/## What's next[\s\S]*$/, ""));
  assert.deepEqual(result, { ok: false, message: "prism: Missing or empty required field: story.next" });
});
