import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExperienceSection } from "./ExperienceSection";

const job = {
  dates: "May 2024 – Oct 2024",
  title: "Junior Website Developer",
  org: "KRIL Digital",
  did: ["Took about 20 client websites from brief to live site.", "Pages loaded about 70% faster."],
  taught: "marketing and branding",
};

function render(rows = [job]) {
  return renderToStaticMarkup(createElement(ExperienceSection, { rows }));
}

test("the first line and what the job taught show without opening anything", () => {
  const visible = render().replace(/<details[\s\S]*?<\/details>/g, "");
  assert.match(visible, /Took about 20 client websites/);
  assert.match(visible, /Taught me: <span class="industry-text">marketing and branding/);
  assert.doesNotMatch(visible, /70% faster/);
});

test("further lines sit behind a More toggle", () => {
  assert.match(render(), /<details class="job-more"><summary>More<\/summary><p>Pages loaded about 70% faster.<\/p><\/details>/);
});

test("a job with one line has no More toggle and no placeholder picture", () => {
  const html = render([{ ...job, did: [job.did[0]] }]);
  assert.doesNotMatch(html, /<details/);
  assert.doesNotMatch(html, /title-card/);
});
