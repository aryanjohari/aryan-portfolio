#!/usr/bin/env tsx
/**
 * Ensure every registry slug has authored case-study beats with valid copy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registry } from "../src/data/registry";
import {
  validateCaseStudiesFile,
  type CaseStudiesFile,
} from "../src/lib/case-study-schema";

const CASE_STUDIES_PATH = resolve(
  process.cwd(),
  "content/project-case-studies.json",
);

const requiredSlugs = registry.map((entry) => entry.slug);

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(CASE_STUDIES_PATH, "utf8")) as CaseStudiesFile;
} catch (err) {
  console.error("Failed to read case studies:", err);
  process.exit(1);
}

const result = validateCaseStudiesFile(raw, requiredSlugs);

if (result.warnings.length > 0) {
  console.warn("\nCase study warnings:");
  for (const warning of result.warnings) {
    console.warn(`  - ${warning.path}: ${warning.message}`);
  }
}

if (!result.ok) {
  console.error("\nCase study validation failed:");
  for (const issue of result.issues) {
    console.error(`  - ${issue.path}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(
  `All ${requiredSlugs.length} registry slug(s) have valid case studies.`,
);
