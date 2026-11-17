import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AllWorkLink } from "./AllWorkLink";

test("links back to the work list on the home page", () => {
  assert.match(renderToStaticMarkup(createElement(AllWorkLink)), /<a href="\/#work">← All work<\/a>/);
});
