#!/usr/bin/env tsx
/**
 * Prebuild gate: the build fails if content/profile.yaml breaks its contract.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

import { validateProfile } from "../src/lib/profile-schema";

const PROFILE_PATH = resolve(process.cwd(), "content/profile.yaml");

const result = validateProfile(parse(readFileSync(PROFILE_PATH, "utf8")));

if (!result.ok) {
  console.error(`Invalid ${PROFILE_PATH}: ${result.message}`);
  process.exit(1);
}

console.log(`Validated ${PROFILE_PATH}`);
