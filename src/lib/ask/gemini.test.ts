import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { embedTexts, generateJson } from "./gemini";

const config = { apiKey: "test-key", model: "test-model", timeoutMs: 1000 };
const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

function fakeFetch(status: number, body: unknown) {
  calls = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("sends the key in a header, never in the URL, and returns one vector per text", async () => {
  fakeFetch(200, { embeddings: [{ values: [1, 0] }, { values: [0, 1] }] });
  const vectors = await embedTexts(["a", "b"], "RETRIEVAL_DOCUMENT", config);

  assert.deepEqual(vectors, [
    [1, 0],
    [0, 1],
  ]);
  assert.ok(!calls[0].url.includes("test-key"));
  assert.equal((calls[0].init.headers as Record<string, string>)["x-goog-api-key"], "test-key");
});

test("rejects an embedding reply with the wrong number of vectors", async () => {
  fakeFetch(200, { embeddings: [{ values: [1, 0] }] });
  await assert.rejects(embedTexts(["a", "b"], "RETRIEVAL_DOCUMENT", config), /expected 2 embeddings, got 1/);
});

test("an API error names the call and the status", async () => {
  fakeFetch(429, { error: { message: "Quota exceeded" } });
  await assert.rejects(generateJson("system", "question", {}, config), /test-model:generateContent failed \(429\): Quota exceeded/);
});

test("returns the model's JSON answer parsed, and rejects text that isn't JSON", async () => {
  fakeFetch(200, { candidates: [{ content: { parts: [{ text: '{"answer":"Hi"}' }] } }] });
  assert.deepEqual(await generateJson("system", "question", {}, config), { answer: "Hi" });

  fakeFetch(200, { candidates: [{ content: { parts: [{ text: "Hi there" }] } }] });
  await assert.rejects(generateJson("system", "question", {}, config), /not valid JSON/);
});
