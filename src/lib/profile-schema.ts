/**
 * Contract for `content/profile.yaml`, the spine every site fact comes from.
 * See docs/V2_PLAN.md §5. Pure: parsing and file reads live in the caller.
 */

export type ProfileThread = {
  /** Referenced by each project's `thread` field. */
  id: string;
  name: string;
  stack: string;
};

export type ProfileExperience = {
  role: string;
  org: string;
  org_note?: string;
  dates: string;
  highlights: string[];
};

export type ProfileEducation = {
  degree: string;
  school: string;
  dates: string;
  note?: string;
};

export type Profile = {
  name: string;
  headline: string;
  tagline: string;
  pitch: string;
  location: string;
  work_rights: string;
  links: { email: string; github: string; linkedin: string; cv: string };
  threads: ProfileThread[];
  experience: ProfileExperience[];
  education: ProfileEducation[];
  certifications: string[];
  referees: string;
};

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; message: string };

const MONTH = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{4}";
/** One date style everywhere ("May 2024 – Oct 2024", en dash), so the site matches the CV. */
const DATE_RANGE_PATTERN = new RegExp(`^${MONTH} – (${MONTH}|present)$`);
const THREAD_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHttpsUrl(value: unknown): value is string {
  return isNonEmptyString(value) && /^https:\/\/\S+$/.test(value);
}

const REQUIRED_TEXT_FIELDS = [
  "name",
  "headline",
  "tagline",
  "pitch",
  "location",
  "work_rights",
  "referees",
] as const;

export function validateProfile(data: unknown): ProfileResult {
  if (!isRecord(data)) {
    return { ok: false, message: "Expected a YAML object at root" };
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!isNonEmptyString(data[field])) {
      return { ok: false, message: `Missing or empty required field: ${field}` };
    }
  }

  const links = data.links;
  if (!isRecord(links)) {
    return { ok: false, message: "Missing or invalid required field: links" };
  }
  if (!isNonEmptyString(links.email) || !EMAIL_PATTERN.test(links.email)) {
    return { ok: false, message: "links.email must be an email address" };
  }
  for (const key of ["github", "linkedin"] as const) {
    if (!isHttpsUrl(links[key])) {
      return { ok: false, message: `links.${key} must be an https:// URL` };
    }
  }
  if (!isNonEmptyString(links.cv) || !links.cv.startsWith("/")) {
    return { ok: false, message: "links.cv must be a site path starting with /" };
  }

  if (!Array.isArray(data.threads) || data.threads.length === 0) {
    return { ok: false, message: "Field threads must be a non-empty array" };
  }
  const threadIds = new Set<string>();
  for (const [index, thread] of data.threads.entries()) {
    const at = `threads[${index}]`;
    if (!isRecord(thread)) {
      return { ok: false, message: `${at} must be an object` };
    }
    if (!isNonEmptyString(thread.id) || !THREAD_ID_PATTERN.test(thread.id)) {
      return { ok: false, message: `${at}.id must be lowercase letters, digits or dashes` };
    }
    if (threadIds.has(thread.id)) {
      return { ok: false, message: `${at}.id "${thread.id}" is used twice` };
    }
    threadIds.add(thread.id);
    for (const key of ["name", "stack"] as const) {
      if (!isNonEmptyString(thread[key])) {
        return { ok: false, message: `Missing or empty required field: ${at}.${key}` };
      }
    }
  }

  if (!Array.isArray(data.experience) || data.experience.length === 0) {
    return { ok: false, message: "Field experience must be a non-empty array" };
  }
  for (const [index, job] of data.experience.entries()) {
    const at = `experience[${index}]`;
    if (!isRecord(job)) {
      return { ok: false, message: `${at} must be an object` };
    }
    for (const key of ["role", "org"] as const) {
      if (!isNonEmptyString(job[key])) {
        return { ok: false, message: `Missing or empty required field: ${at}.${key}` };
      }
    }
    if (job.org_note !== undefined && !isNonEmptyString(job.org_note)) {
      return { ok: false, message: `${at}.org_note must be a non-empty string when provided` };
    }
    if (!isNonEmptyString(job.dates) || !DATE_RANGE_PATTERN.test(job.dates)) {
      return { ok: false, message: `${at}.dates must look like "May 2024 – Oct 2024" or "Oct 2026 – present" (en dash)` };
    }
    if (!isStringArray(job.highlights)) {
      return { ok: false, message: `${at}.highlights must be a non-empty array of strings` };
    }
  }

  if (!Array.isArray(data.education) || data.education.length === 0) {
    return { ok: false, message: "Field education must be a non-empty array" };
  }
  for (const [index, school] of data.education.entries()) {
    const at = `education[${index}]`;
    if (!isRecord(school)) {
      return { ok: false, message: `${at} must be an object` };
    }
    for (const key of ["degree", "school"] as const) {
      if (!isNonEmptyString(school[key])) {
        return { ok: false, message: `Missing or empty required field: ${at}.${key}` };
      }
    }
    if (!isNonEmptyString(school.dates) || !DATE_RANGE_PATTERN.test(school.dates)) {
      return { ok: false, message: `${at}.dates must look like "Feb 2025 – Jul 2026" (en dash)` };
    }
    if (school.note !== undefined && !isNonEmptyString(school.note)) {
      return { ok: false, message: `${at}.note must be a non-empty string when provided` };
    }
  }

  if (!isStringArray(data.certifications)) {
    return { ok: false, message: "Field certifications must be a non-empty array of strings" };
  }

  return { ok: true, profile: data as Profile };
}
