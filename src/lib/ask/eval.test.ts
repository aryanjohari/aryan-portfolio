import assert from "node:assert/strict";
import { test } from "node:test";

import type { AskReply } from "./answer";
import { type EvalCase, retrievalHit, scoreReply } from "./eval";

const reply = (overrides: Partial<AskReply>): AskReply => ({ answer: "An answer.", sources: [], actions: [], ...overrides });
const source = (id: string) => ({ id, title: id, url: "/" });

test("retrieval counts as a hit when any picked section starts with an expected prefix", () => {
  assert.equal(retrievalHit(["prism#overview", "pii-gateway#problem"], ["pii-gateway#"]), true);
  assert.equal(retrievalHit(["prism#overview"], ["pii-gateway#"]), false);
  assert.equal(retrievalHit(["prism#overview"], undefined), null);
});

test("an answer case passes with an expected source, the expected action and no forbidden text", () => {
  const evalCase: EvalCase = { id: "privacy", question: "?", expect: "answer", sections: ["pii-gateway#"], action: "demo", forbid: ["excited"] };
  const good = scoreReply(reply({ sources: [source("pii-gateway#overview")], actions: [{ kind: "demo", label: "Try", href: "https://x" }] }), evalCase);
  assert.deepEqual(good, { sources: true, action: true, forbidden: true, pass: true });

  const bad = scoreReply(reply({ answer: "He is excited.", sources: [source("prism#overview")] }), evalCase);
  assert.deepEqual(bad, { sources: false, action: false, forbidden: false, pass: false });
});

test("a decline case passes only with no sources, and forbidden text is matched ignoring case", () => {
  const evalCase: EvalCase = { id: "phone", question: "?", expect: "decline", forbid: ["021", "Rules:"] };
  assert.equal(scoreReply(reply({ answer: "The site doesn't list it." }), evalCase).pass, true);
  assert.equal(scoreReply(reply({ sources: [source("profile#about")] }), evalCase).pass, false);
  assert.equal(scoreReply(reply({ answer: "rules: use only..." }), evalCase).pass, false);
});
