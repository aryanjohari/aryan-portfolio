import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHomeFile, parseStoryFile, splitChapterLabel } from "./site-text";

test("reads the home headline from the frontmatter and the bio from the body", () => {
  const result = parseHomeFile("---\nheadline: I build software.\n---\n\nShort bio with a [link](/projects/prism).\n");
  assert.deepEqual(result, {
    ok: true,
    value: { headline: "I build software.", bio: "Short bio with a [link](/projects/prism)." },
  });
});

test("rejects a home file with no bio", () => {
  assert.deepEqual(parseHomeFile("---\nheadline: I build software.\n---\n\n"), {
    ok: false,
    message: "home.md needs the short bio as its body",
  });
});

test("splits the story into chapters, each with an optional italic label line", () => {
  const result = parseStoryFile(`---
title: From Notepad to Auckland.
summary: One line.
---

## Notepad, my uncle's PC

It started here.

## Koverify, then KRIL Digital

*Mumbai · 2021 – 2024*

Two jobs.
`);
  assert.ok(result.ok);
  assert.deepEqual(result.value.chapters, [
    { title: "Notepad, my uncle's PC", body: "It started here." },
    { title: "Koverify, then KRIL Digital", label: "Mumbai · 2021 – 2024", body: "Two jobs." },
  ]);
});

test("rejects story text that sits outside a chapter, instead of dropping it", () => {
  const result = parseStoryFile("---\ntitle: T\nsummary: S\n---\n\nStray paragraph.\n\n## One\n\nBody.\n");
  assert.deepEqual(result, { ok: false, message: "story.md text must sit under a ## chapter heading" });
});

test("splits a chapter label into the place and, when given, the years", () => {
  assert.deepEqual(splitChapterLabel("Mumbai · 2021 – 2024"), { place: "Mumbai", when: "2021 – 2024" });
  assert.deepEqual(splitChapterLabel("Where it started"), { place: "Where it started" });
  assert.deepEqual(splitChapterLabel(undefined), {});
});
