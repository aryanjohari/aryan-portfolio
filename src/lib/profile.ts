import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

import { type Profile, validateProfile } from "@/lib/profile-schema";

const PROFILE_PATH = resolve(process.cwd(), "content/profile.yaml");

let cached: Profile | undefined;

/** Reads and validates the spine once per build. Throws so a bad file never renders. */
export function getProfile(): Profile {
  if (cached) return cached;
  const result = validateProfile(parse(readFileSync(PROFILE_PATH, "utf8")));
  if (!result.ok) {
    throw new Error(`Invalid ${PROFILE_PATH}: ${result.message}`);
  }
  cached = result.profile;
  return cached;
}
