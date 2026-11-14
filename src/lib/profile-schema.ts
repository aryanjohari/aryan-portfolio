/**
 * Contract for `content/profile.yaml`, the spine every site fact comes from.
 * See docs/V2_PLAN.md §5. Pure: parsing and file reads live in the caller.
 */

import {
  DATE_RANGE_HINT,
  DATE_RANGE_PATTERN,
  isHttpsUrl,
  isNonEmptyString,
  isRecord,
  isStringArray,
} from "./schema-helpers";

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
  /** The industry this job taught; shown on the home page. Required unless the job is hidden. */
  taught?: string;
  /** Kept in the spine (CV, guide) but left off the home page. */
  hidden?: boolean;
};

export type ProfileEducation = {
  degree: string;
  school: string;
  dates: string;
  note?: string;
  taught?: string;
};

export const EPIGRAPH_SECTIONS = ["work", "experience"] as const;

/** A short quote at the head of a home-page section. */
export type ProfileEpigraph = {
  section: (typeof EPIGRAPH_SECTIONS)[number];
  quote: string;
  author: string;
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
  epigraphs?: ProfileEpigraph[];
};

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; message: string };

const THREAD_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      return { ok: false, message: `${at}.dates must look like ${DATE_RANGE_HINT}` };
    }
    if (!isStringArray(job.highlights)) {
      return { ok: false, message: `${at}.highlights must be a non-empty array of strings` };
    }
    if (job.hidden !== undefined && typeof job.hidden !== "boolean") {
      return { ok: false, message: `${at}.hidden must be true or false when provided` };
    }
    if (job.hidden !== true && !isNonEmptyString(job.taught)) {
      return { ok: false, message: `${at}.taught is required for a job shown on the home page` };
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
      return { ok: false, message: `${at}.dates must look like ${DATE_RANGE_HINT}` };
    }
    for (const key of ["note", "taught"] as const) {
      if (school[key] !== undefined && !isNonEmptyString(school[key])) {
        return { ok: false, message: `${at}.${key} must be a non-empty string when provided` };
      }
    }
  }

  if (!isStringArray(data.certifications)) {
    return { ok: false, message: "Field certifications must be a non-empty array of strings" };
  }

  if (data.epigraphs !== undefined) {
    if (!Array.isArray(data.epigraphs)) {
      return { ok: false, message: "Field epigraphs must be an array when provided" };
    }
    const sections = new Set<string>();
    for (const [index, epigraph] of data.epigraphs.entries()) {
      const at = `epigraphs[${index}]`;
      if (!isRecord(epigraph) || !isNonEmptyString(epigraph.quote) || !isNonEmptyString(epigraph.author)) {
        return { ok: false, message: `${at} needs a quote and an author` };
      }
      if (!(EPIGRAPH_SECTIONS as readonly unknown[]).includes(epigraph.section)) {
        return { ok: false, message: `${at}.section must be one of: ${EPIGRAPH_SECTIONS.join(", ")}` };
      }
      if (sections.has(epigraph.section as string)) {
        return { ok: false, message: `${at}.section "${epigraph.section}" already has an epigraph` };
      }
      sections.add(epigraph.section as string);
    }
  }

  return { ok: true, profile: data as Profile };
}
