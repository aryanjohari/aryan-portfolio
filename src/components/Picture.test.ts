import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Picture } from "./Picture";

test("without a picture file, shows a title card with the label and its detail line", () => {
  const html = renderToStaticMarkup(createElement(Picture, { label: "GSTF", detail: "In progress · Thesis done" }));
  assert.match(html, /class="photo title-card[^"]*" aria-hidden="true"/);
  assert.match(html, />GSTF</);
  assert.match(html, />In progress · Thesis done</);
  assert.doesNotMatch(html, /picture to come/);
});

test("with a picture file, shows the picture and no card", () => {
  const html = renderToStaticMarkup(createElement(Picture, { src: "/projects/prism/face.jpg", label: "Prism" }));
  assert.match(html, /^<img [^>]*src="\/projects\/prism\/face.jpg"/);
  assert.doesNotMatch(html, /title-card/);
});
