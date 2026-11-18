import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskBox } from "./AskBox";

test("the closed Ask box is a plain form, not a dialog", () => {
  const html = renderToStaticMarkup(createElement(AskBox, { pages: {} }));
  assert.match(html, /<div class="ask" data-open="false"><form aria-label="Ask about Aryan&#x27;s work">/);
  assert.doesNotMatch(html, /role="dialog"|aria-modal/);
});
