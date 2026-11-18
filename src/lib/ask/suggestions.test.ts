import assert from "node:assert/strict";
import { test } from "node:test";

import { type AskPages, suggestionsFor } from "./suggestions";

const pages: AskPages = {
  "/projects/prism": { title: "Prism", hasDemo: true },
  "/projects/ada": { title: "ADA", hasDemo: false },
};
const EVERY_PAGE = ["I'm hiring: the 30-second version", "Email Aryan"];

test("the home page suggests where to start and the long story", () => {
  assert.deepEqual(suggestionsFor("/", pages), [
    "Which project should I look at first?",
    "Take me to the long story",
    ...EVERY_PAGE,
  ]);
});

test("a project page asks about that project, and offers its demo only when it has one", () => {
  assert.deepEqual(suggestionsFor("/projects/prism", pages), [
    "What was hard about Prism?",
    "Why this key decision?",
    "Show me the demo",
    ...EVERY_PAGE,
  ]);
  assert.ok(!suggestionsFor("/projects/ada", pages).includes("Show me the demo"));
});

test("any other page gets only the suggestions that fit everywhere", () => {
  assert.deepEqual(suggestionsFor("/story", pages), EVERY_PAGE);
});
