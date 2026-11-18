import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { handleAsk } from "./handle";
import type { AskIndex } from "./sections";

const index: AskIndex = {
  builtAt: "2026-11-15T00:00:00Z",
  embeddingModel: "embed-model",
  sections: [
    { id: "pii-gateway#overview", title: "PII Gateway", url: "/projects/pii-gateway", text: "Removes personal details. Privacy." },
    { id: "prism#overview", title: "Prism", url: "/projects/prism", text: "Photo looks." },
  ],
  vectors: [
    [0, 1],
    [1, 0],
  ],
  demos: [{ slug: "pii-gateway", title: "PII Gateway", url: "https://pii.example.nz" }],
  contactEmail: "aryan@example.com",
};
const settings = { apiKey: "key", answerModel: "answer-model", embeddingModel: "embed-model" };

const realFetch = globalThis.fetch;
const realError = console.error;
let sentPrompts: string[] = [];
let logged: string[] = [];

/** Fakes Gemini: the embedding call returns `questionVector` (or fails), the answer call returns `answer`. */
function fakeGemini({ questionVector, answer, answerStatus = 200 }: { questionVector?: number[]; answer?: unknown; answerStatus?: number }) {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (url.includes(":batchEmbedContents")) {
      if (!questionVector) return new Response(JSON.stringify({ error: { message: "down" } }), { status: 503 });
      return new Response(JSON.stringify({ embeddings: [{ values: questionVector }] }));
    }
    sentPrompts.push(String(init.body));
    const text = typeof answer === "string" ? answer : JSON.stringify(answer);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: answerStatus });
  }) as typeof fetch;
}

beforeEach(() => {
  sentPrompts = [];
  logged = [];
  console.error = (message: string) => logged.push(message);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
});

test("answers with checked sources and actions, picking sections by meaning", async () => {
  fakeGemini({
    questionVector: [0, 1],
    answer: { answer: "PII Gateway handles privacy.", sources: ["pii-gateway#overview"], actions: [{ type: "open_demo", target: "pii-gateway" }] },
  });
  const result = await handleAsk({ question: "Which project is about privacy?" }, index, settings);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    answer: "PII Gateway handles privacy.",
    sources: [{ id: "pii-gateway#overview", title: "PII Gateway", url: "/projects/pii-gateway" }],
    actions: [{ kind: "demo", label: "Try PII Gateway", href: "https://pii.example.nz" }],
    retrieval: "embedding",
  });
  // Only the matching section's full text went to the model.
  assert.ok(sentPrompts[0].includes("Removes personal details"));
  assert.ok(!sentPrompts[0].includes("Photo looks."));
});

test("falls back to keyword search when the question can't be embedded", async () => {
  fakeGemini({ answer: { answer: "PII Gateway.", sources: [], actions: [] } });
  const result = await handleAsk({ question: "privacy project?" }, index, settings);

  assert.equal(result.status, 200);
  assert.equal((result.body as { retrieval: string }).retrieval, "keyword");
  assert.ok(sentPrompts[0].includes("Removes personal details"));
});

test("is off (503) with no API key, and rejects a bad question (400) before calling anything", async () => {
  fakeGemini({});
  assert.equal((await handleAsk({ question: "hi" }, index, { ...settings, apiKey: undefined })).status, 503);
  assert.equal((await handleAsk({ question: "x".repeat(301) }, index, settings)).status, 400);
  assert.equal(sentPrompts.length, 0);
});

test("a failed or malformed answer is a 502 with a friendly message, and the log never holds the question", async () => {
  fakeGemini({ questionVector: [0, 1], answer: { error: { message: "quota" } }, answerStatus: 429 });
  const failed = await handleAsk({ question: "my secret question" }, index, settings);
  assert.equal(failed.status, 502);
  assert.match((failed.body as { error: string }).error, /try again/i);

  fakeGemini({ questionVector: [0, 1], answer: { sources: [] } });
  assert.equal((await handleAsk({ question: "my secret question" }, index, settings)).status, 502);

  assert.ok(logged.length > 0);
  assert.ok(logged.every((line) => !line.includes("my secret question")));
});

test("a page the site has puts its section first and names it; any other page is ignored", async () => {
  // The question's meaning points at PII Gateway, but the visitor is on Prism's page.
  fakeGemini({ questionVector: [0, 1], answer: { answer: "Prism.", sources: ["prism#overview"], actions: [] } });
  await handleAsk({ question: "Tell me about this project", page: "/projects/prism" }, index, settings);
  const prompt = sentPrompts[0];
  assert.ok(prompt.includes("PAGE: the visitor is reading \\\"Prism\\\" (/projects/prism)."));
  assert.ok(prompt.indexOf("Photo looks.") < prompt.indexOf("Removes personal details"));

  sentPrompts = [];
  await handleAsk({ question: "Tell me about this project", page: "/admin" }, index, settings);
  assert.ok(!sentPrompts[0].includes("PAGE:"));
  assert.ok(!sentPrompts[0].includes("Photo looks."));
});
