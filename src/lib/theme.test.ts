import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveTheme } from "./theme";

test("a saved choice wins over the OS setting", () => {
  assert.equal(resolveTheme("paper", true), "paper");
  assert.equal(resolveTheme("phosphor", false), "phosphor");
});

test("with no saved choice, or a value that isn't a theme, it follows the OS", () => {
  assert.equal(resolveTheme(null, true), "phosphor");
  assert.equal(resolveTheme(null, false), "paper");
  assert.equal(resolveTheme("dark", false), "paper");
});
