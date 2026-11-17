import assert from "node:assert/strict";
import { test } from "node:test";

import { getProfile } from "@/lib/profile";

import * as siteNotFound from "./not-found";
import * as projectNotFound from "./projects/[slug]/not-found";

const expected = `Page not found · ${getProfile().name}`;

test("the site 404 page has its own tab title", () => {
  assert.equal(siteNotFound.generateMetadata?.().title, expected);
});

test("a missing project's 404 page has the same tab title", () => {
  assert.equal(projectNotFound.generateMetadata?.().title, expected);
});
