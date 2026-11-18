import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { askQuestion } from "./client";

const realFetch = globalThis.fetch;

function respond(status: number, body: unknown) {
  globalThis.fetch = (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("returns the answer, sources and actions from a good reply", async () => {
  respond(200, {
    answer: "PII Gateway.",
    sources: [{ id: "pii-gateway#overview", title: "PII Gateway", url: "/projects/pii-gateway" }],
    actions: [{ kind: "demo", label: "Try PII Gateway", href: "https://pii.example.nz" }],
    retrieval: "embedding",
  });
  assert.deepEqual(await askQuestion("privacy?"), {
    ok: true,
    reply: {
      answer: "PII Gateway.",
      sources: [{ id: "pii-gateway#overview", title: "PII Gateway", url: "/projects/pii-gateway" }],
      actions: [{ kind: "demo", label: "Try PII Gateway", href: "https://pii.example.nz" }],
    },
  });
});

test("too many requests asks the visitor to wait", async () => {
  respond(429, "Too Many Requests");
  assert.deepEqual(await askQuestion("hi"), { ok: false, message: "Too many questions at once. Try again in a minute." });
});

test("shows the server's own message for a 400 or 502", async () => {
  respond(502, { error: "The Ask box couldn't answer just now." });
  assert.deepEqual(await askQuestion("hi"), { ok: false, message: "The Ask box couldn't answer just now." });
});

test("a network failure or a malformed reply becomes one friendly message, never a crash", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  assert.equal((await askQuestion("hi")).ok, false);

  respond(200, { answer: 42, sources: "nope" });
  const malformed = await askQuestion("hi");
  assert.equal(malformed.ok, false);

  // Actions of an unknown kind or with a non-string link are dropped, not rendered.
  respond(200, { answer: "Hi.", sources: [], actions: [{ kind: "run", label: "x", href: "y" }, { kind: "page", label: "Home", href: 5 }] });
  assert.deepEqual(await askQuestion("hi"), { ok: true, reply: { answer: "Hi.", sources: [], actions: [] } });
});

test("sends the page the visitor is on with the question", async () => {
  let sent: unknown;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ answer: "Prism.", sources: [], actions: [] }));
  }) as typeof fetch;
  await askQuestion("Tell me about this project", "/projects/prism");
  assert.deepEqual(sent, { question: "Tell me about this project", page: "/projects/prism" });
});
