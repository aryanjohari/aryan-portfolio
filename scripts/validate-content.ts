#!/usr/bin/env tsx
/**
 * Prebuild gate: the build fails if any file in content/ breaks its contract:
 * profile.yaml, home.md, story.md, and each project alone or as a set.
 */
import { getProfile } from "../src/lib/profile";
import { getProjects } from "../src/lib/projects";
import { getHomeText, getStoryText } from "../src/lib/site-text-files";

try {
  getProfile();
  getHomeText();
  const story = getStoryText();
  const projects = getProjects();
  console.log(
    `Validated profile.yaml, home.md, story.md (${story.chapters.length} chapters) and ${projects.length} project(s)`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
