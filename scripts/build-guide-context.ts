#!/usr/bin/env tsx
/**
 * Prebuild step: writes the AI guide's context from content/ into
 * src/lib/generated/guide-context.json (gitignored), so the route bundles it
 * and never reads files at request time.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildGuideContext } from "../src/lib/guide-context";
import { getProfile } from "../src/lib/profile";
import { getProjects } from "../src/lib/projects";

export const GUIDE_CONTEXT_PATH = resolve(process.cwd(), "src/lib/generated/guide-context.json");

try {
  const context = buildGuideContext(getProfile(), getProjects(), new Date().toISOString());
  mkdirSync(dirname(GUIDE_CONTEXT_PATH), { recursive: true });
  writeFileSync(GUIDE_CONTEXT_PATH, `${JSON.stringify(context, null, 2)}\n`);
  console.log(`Wrote guide context (${context.meta.contextCharCount} chars, ${context.projects.length} project(s))`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
