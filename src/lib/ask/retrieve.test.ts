import assert from "node:assert/strict";
import { test } from "node:test";

import { cosineSimilarity, pickByEmbedding, pickByKeywords, withPageFirst } from "./retrieve";
import type { AskSection } from "./sections";

function section(id: string, title: string, text: string): AskSection {
  return { id, title, url: "/", text };
}

const sections = [
  section("prism#overview", "Prism", "A browser photo-styling tool with WebGL looks."),
  section("pii#overview", "PII Gateway", "Removes names and emails before data is stored. Privacy first."),
  section("profile#about", "About Aryan", "Full-stack developer in Auckland. Work rights: Post Study Work Visa."),
];

test("cosine similarity is 1 for the same direction and 0 for unrelated vectors", () => {
  assert.equal(cosineSimilarity([1, 2], [2, 4]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("embedding search returns the closest sections first and drops weak matches", () => {
  const vectors = [
    [1, 0, 0],
    [0, 1, 0],
    [0.6, 0.8, 0],
  ];
  const picked = pickByEmbedding([0, 1, 0], vectors, sections, { limit: 4, minScore: 0.5 });
  assert.deepEqual(
    picked.map((item) => item.id),
    ["pii#overview", "profile#about"],
  );
});

test("keyword search matches words in the title and text, ignoring case and filler words", () => {
  assert.equal(pickByKeywords("Tell me about the privacy gateway", sections, { limit: 1 })[0]?.id, "pii#overview");
  assert.equal(pickByKeywords("Does he have WORK RIGHTS?", sections, { limit: 1 })[0]?.id, "profile#about");
});

test("keyword search returns nothing when no word matches, so only the index is sent", () => {
  assert.deepEqual(pickByKeywords("what is the weather like", sections, { limit: 4 }), []);
});

test("the page the visitor is on comes first, then the picked sections, with no repeats", () => {
  const onPages: AskSection[] = [
    { id: "prism#overview", title: "Prism", url: "/projects/prism", text: "a" },
    { id: "prism#problem", title: "Prism · Problem", url: "/projects/prism#story-problem", text: "b" },
    { id: "prism#built", title: "Prism · Built", url: "/projects/prism#story-built", text: "c" },
    { id: "pii#overview", title: "PII", url: "/projects/pii", text: "d" },
  ];
  const picked = [onPages[3], onPages[1]];

  assert.deepEqual(
    withPageFirst(picked, onPages, "/projects/prism", 3).map((item) => item.id),
    ["prism#overview", "prism#problem", "pii#overview"],
  );
  assert.deepEqual(withPageFirst(picked, onPages, undefined, 3), picked);
});
