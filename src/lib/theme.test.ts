import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveTheme, themeSwitchLabel } from "./theme";

test("a saved choice wins over the OS setting", () => {
  assert.equal(resolveTheme("paper", true), "paper");
  assert.equal(resolveTheme("phosphor", false), "phosphor");
});

test("with no saved choice, or a value that isn't a theme, it follows the OS", () => {
  assert.equal(resolveTheme(null, true), "phosphor");
  assert.equal(resolveTheme(null, false), "paper");
  assert.equal(resolveTheme("dark", false), "paper");
});

test("the switch names the theme it goes to in plain words, not the theme's internal name", () => {
  assert.deepEqual(themeSwitchLabel("paper"), { text: "Dark", ariaLabel: "Switch to the dark theme" });
  assert.deepEqual(themeSwitchLabel("phosphor"), { text: "Light", ariaLabel: "Switch to the light theme" });
});
