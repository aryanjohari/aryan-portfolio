#!/usr/bin/env tsx
/**
 * Prebuild step: copies each repo project's portfolio.yaml and face image from
 * its main branch into .cache/projects and public/fetched (both gitignored).
 * PORTFOLIO_FETCH_SKIP=true keeps whatever is already cached (offline dev).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { fetchRepoProject } from "../src/lib/fetch-project";
import type { ProjectIndexEntry } from "../src/lib/portfolio-schema";
import { FETCH_CACHE_DIR, fetchedFacePath, readProjectIndex } from "../src/lib/projects";

async function main() {
  if (process.env.PORTFOLIO_FETCH_SKIP === "true") {
    console.log("PORTFOLIO_FETCH_SKIP=true: using cached project files");
    return;
  }

  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const repoEntries = readProjectIndex().filter(
    (entry): entry is Required<ProjectIndexEntry> => entry.repo !== undefined,
  );

  for (const { slug, repo } of repoEntries) {
    const fetched = await fetchRepoProject(repo, { token });

    mkdirSync(FETCH_CACHE_DIR, { recursive: true });
    writeFileSync(resolve(FETCH_CACHE_DIR, `${slug}.yaml`), fetched.yamlText);

    if (fetched.face) {
      const target = resolve(process.cwd(), "public", `.${fetchedFacePath(slug, fetched.face.repoPath)}`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, fetched.face.bytes);
    }
    console.log(`Fetched ${slug} from ${repo}${fetched.face ? " (with face image)" : ""}`);
  }

  if (repoEntries.length === 0) {
    console.log("No repo projects in content/projects.yaml; nothing to fetch");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
