/** Shared checks for the content contracts (profile.yaml and project yaml). */

const MONTH = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4}";

/** One date style everywhere ("May 2024 – Oct 2024", en dash), so the site matches the CV. */
export const DATE_RANGE_PATTERN = new RegExp(`^${MONTH} – (${MONTH}|present)$`);

export const DATE_RANGE_HINT = '"May 2024 – Oct 2024" or "Oct 2026 – present" (en dash)';

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isHttpsUrl(value: unknown): value is string {
  return isNonEmptyString(value) && /^https:\/\/\S+$/.test(value);
}
