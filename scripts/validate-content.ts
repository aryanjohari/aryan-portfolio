#!/usr/bin/env tsx
/**
 * Prebuild gate: the build fails if content/profile.yaml breaks its contract.
 */
import { getProfile } from "../src/lib/profile";

try {
  getProfile();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log("Validated content/profile.yaml");
