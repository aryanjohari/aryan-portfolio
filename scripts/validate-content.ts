#!/usr/bin/env tsx
/**
 * Prebuild gate: the build fails if profile.yaml or any project yaml breaks
 * its contract, alone or as a set.
 */
import { getProfile } from "../src/lib/profile";
import { getProjects } from "../src/lib/projects";

try {
  getProfile();
  const projects = getProjects();
  console.log(`Validated content/profile.yaml and ${projects.length} project(s)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
