import assert from "node:assert/strict";
import { test } from "node:test";

import { checkAnswer, parseQuestion, QUESTION_MAX_CHARS } from "./answer";
import type { AskSection } from "./sections";

const sections: AskSection[] = [
  { id: "prism#decision", title: "Prism · The key decision", url: "/projects/prism#story-decision", text: "No generated pixels." },
  { id: "profile#about", title: "About Aryan", url: "/", text: "Auckland." },
];
const allowed = {
  sections,
  demos: [{ slug: "prism", title: "Prism", url: "https://image.example.nz" }],
  contactEmail: "aryan@example.com",
};

test("accepts a question of 1 to 300 characters, trimmed and with spaces collapsed", () => {
  assert.deepEqual(parseQuestion({ question: "  What   is Prism? " }), { ok: true, question: "What is Prism?" });
  assert.equal(parseQuestion({ question: "   " }).ok, false);
  assert.equal(parseQuestion({ question: "x".repeat(QUESTION_MAX_CHARS + 1) }).ok, false);
  assert.equal(parseQuestion({ question: 42 }).ok, false);
  assert.equal(parseQuestion(null).ok, false);
});

test("keeps real sources and actions, turning them into links the server built", () => {
  const result = checkAnswer(
    {
      answer: "Prism never generates pixels.",
      sources: ["prism#decision"],
      actions: [
        { type: "open_page", target: "prism#decision" },
        { type: "open_demo", target: "prism" },
      ],
    },
    allowed,
  );
  assert.deepEqual(result, {
    ok: true,
    reply: {
      answer: "Prism never generates pixels.",
      sources: [{ id: "prism#decision", title: "Prism · The key decision", url: "/projects/prism#story-decision" }],
      actions: [
        { kind: "page", label: "Open Prism · The key decision", href: "/projects/prism#story-decision" },
        { kind: "demo", label: "Try Prism", href: "https://image.example.nz" },
      ],
    },
  });
});

test("drops sources and actions that don't exist instead of passing them on", () => {
  const result = checkAnswer(
    {
      answer: "Here you go.",
      sources: ["made-up#section", "profile#about"],
      actions: [
        { type: "open_page", target: "/admin" },
        { type: "open_demo", target: "pii-gateway" },
        { type: "delete_everything", target: "x" },
      ],
    },
    allowed,
  );
  assert.ok(result.ok);
  assert.deepEqual(
    result.reply.sources.map((source) => source.id),
    ["profile#about"],
  );
  assert.deepEqual(result.reply.actions, []);
});

test("an email draft always goes to Aryan, with the subject and body encoded and capped", () => {
  const result = checkAnswer(
    {
      answer: "You can email him.",
      sources: [],
      actions: [{ type: "draft_email", target: "someone-else@example.com", subject: "Role & interview?", body: "Hi Aryan,\nAre you free?" + "x".repeat(5000) }],
    },
    allowed,
  );
  assert.ok(result.ok);
  const [action] = result.reply.actions;
  assert.equal(action.kind, "email");
  assert.ok(action.href.startsWith("mailto:aryan@example.com?subject=Role%20%26%20interview%3F&body=Hi%20Aryan%2C%0AAre%20you%20free%3F"));
  assert.ok(!action.href.includes("someone-else"));
  assert.ok(action.href.length < 1600);
});

test("rejects a reply without an answer, so the route can say 'try again' instead", () => {
  assert.equal(checkAnswer({ sources: [], actions: [] }, allowed).ok, false);
  assert.equal(checkAnswer({ answer: "  ", sources: [], actions: [] }, allowed).ok, false);
  assert.equal(checkAnswer("not an object", allowed).ok, false);
});
