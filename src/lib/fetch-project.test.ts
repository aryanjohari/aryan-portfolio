import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchRepoProject } from "./fetch-project";

/** Stands in for GitHub's raw file host: serves the given paths, 404s everything else. */
function fakeGitHub(files: Record<string, string>): typeof fetch {
  return (async (url: string | URL | Request) => {
    const body = files[String(url)];
    return body === undefined ? new Response("Not Found", { status: 404 }) : new Response(body);
  }) as typeof fetch;
}

const RAW = "https://raw.githubusercontent.com/aryanjohari/prism/main";

test("downloads portfolio.yaml from main and the face image it names", async () => {
  const fetchImpl = fakeGitHub({
    [`${RAW}/portfolio.yaml`]: "title: Prism\nface: docs/face.png\n",
    [`${RAW}/docs/face.png`]: "PNGBYTES",
  });

  const fetched = await fetchRepoProject("aryanjohari/prism", { fetchImpl });

  assert.equal(fetched.yamlText, "title: Prism\nface: docs/face.png\n");
  assert.equal(fetched.face?.repoPath, "docs/face.png");
  assert.equal(new TextDecoder().decode(fetched.face?.bytes), "PNGBYTES");
});

test("fails loudly with the URL and a token hint when the repo has no portfolio.yaml", async () => {
  await assert.rejects(fetchRepoProject("aryanjohari/prism", { fetchImpl: fakeGitHub({}) }), {
    message: `GET ${RAW}/portfolio.yaml failed with HTTP 404; private repos need GITHUB_TOKEN`,
  });
});
