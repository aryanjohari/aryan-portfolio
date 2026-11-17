import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProjectVideo } from "./ProjectVideo";

function render() {
  return renderToStaticMarkup(
    createElement(ProjectVideo, { src: "/projects/prism/loop.webm", poster: "/projects/prism/face.jpg" }),
  );
}

test("shows no native playback bar", () => {
  assert.doesNotMatch(render(), /\scontrols(=|\s|>)/);
});

test("wraps the video in a button that offers to play it before it starts", () => {
  assert.match(render(), /^<button type="button"[^>]*aria-label="Play video"[^>]*><video /);
});
