#!/usr/bin/env tsx
/**
 * Prebuild gate: the build fails if any file in content/ breaks its contract
 * (profile.yaml, home.md, story.md, each project alone and as a set), holds a
 * phone number, or, in a production deploy, still has TODO text.
 */
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { checkContent, type ContentFile } from "../src/lib/content-guards";
import { getProfile } from "../src/lib/profile";
import { getProjects } from "../src/lib/projects";
import { getHomeText, getStoryText } from "../src/lib/site-text-files";

const CONTENT_DIR = resolve(process.cwd(), "content");

function readContentFiles(): ContentFile[] {
  return readdirSync(CONTENT_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(md|ya?ml)$/.test(entry.name))
    .map((entry) => {
      const path = resolve(entry.parentPath, entry.name);
      return { path: relative(process.cwd(), path), text: readFileSync(path, "utf8") };
    });
}

try {
  getProfile();
  getHomeText();
  const story = getStoryText();
  const projects = getProjects();

  // Vercel sets VERCEL_ENV=production only for the production deploy, not previews or local builds.
  const production = process.env.VERCEL_ENV === "production";
  const { errors, warnings } = checkContent(readContentFiles(), { production });

  if (warnings.length > 0) {
    console.warn(`${warnings.length} TODO line(s) left; a production deploy will fail until they're edited:`);
    for (const warning of warnings) console.warn(`  ${warning}`);
  }
  if (errors.length > 0) {
    console.error(`Content check failed:\n${errors.map((error) => `  ${error}`).join("\n")}`);
    process.exit(1);
  }

  console.log(
    `Validated profile.yaml, home.md, story.md (${story.chapters.length} chapters) and ${projects.length} project(s)`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
