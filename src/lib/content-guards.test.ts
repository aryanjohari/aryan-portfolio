import assert from "node:assert/strict";
import { test } from "node:test";

import { checkContent } from "./content-guards";

test("fails on a phone number in any build, and names the file and line without repeating it", () => {
  for (const number of ["+64 21 123 4567", "021 123 4567", "09-123-4567"]) {
    const result = checkContent([{ path: "content/home.md", text: `Hi.\nCall me on ${number}.` }], { production: false });
    assert.deepEqual(result.errors, ["content/home.md:2: looks like a phone number; phone numbers never go on the site"]);
  }
});

test("does not mistake dates, counts or years for phone numbers", () => {
  const text = "as_of: 2026-10-23\nproof: 120 tests\n1,080 to 5,555 impressions\nMay 2024 – Oct 2024";
  assert.deepEqual(checkContent([{ path: "content/x.md", text }], { production: true }), { errors: [], warnings: [] });
});

test("TODO text is a warning locally and an error in a production deploy", () => {
  const files = [{ path: "content/home.md", text: "TODO: short bio" }];
  assert.deepEqual(checkContent(files, { production: false }), {
    errors: [],
    warnings: ["content/home.md:1: TODO text not yet edited"],
  });
  assert.deepEqual(checkContent(files, { production: true }), {
    errors: ["content/home.md:1: TODO text not yet edited"],
    warnings: [],
  });
});
