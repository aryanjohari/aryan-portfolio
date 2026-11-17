/**
 * Project contract v2: one `portfolio.yaml` per project (docs/V2_PLAN.md §6).
 * Pure: file reads live in the caller.
 */

import {
  DATE_RANGE_HINT,
  DATE_RANGE_PATTERN,
  isHttpsUrl,
  isNonEmptyString,
  isRecord,
  isStringArray,
} from "./schema-helpers";

export const PROJECT_TIERS = ["featured", "in-progress", "archive"] as const;
export const PROJECT_STATES = ["live", "frozen", "wip"] as const;
export const CODE_VISIBILITIES = ["public", "private"] as const;
export const STORY_PARTS = ["problem", "built", "decision", "learned", "limits", "next"] as const;
export type StoryPart = (typeof STORY_PARTS)[number];

/** The "## " heading each story part uses in a project's Markdown file, and on its page. */
export const STORY_HEADINGS: Record<StoryPart, string> = {
  problem: "The problem",
  built: "What I built",
  decision: "The key decision",
  learned: "What I learned",
  limits: "What it can't do",
  next: "What's next",
};

export type ProjectTier = (typeof PROJECT_TIERS)[number];
export type ProjectState = (typeof PROJECT_STATES)[number];

export type ProjectStory = Record<StoryPart, string>;

export type Project = {
  /** The file name, content/projects/<slug>.md. */
  slug: string;
  title: string;
  summary: string;
  /** "Why I made it", one or two sentences at the top of the project page. */
  why?: string;
  thread: string;
  tier: ProjectTier;
  order: number;
  status: { state: ProjectState; as_of: string; note?: string };
  role: string;
  dates: string;
  stack: string[];
  proves: string;
  proof: string[];
  /** Site path of the face image once copied into public/, e.g. /projects/prism/face.png. */
  face?: string;
  /** Site path of a short silent loop for the project page, e.g. /projects/prism/loop.webm. Needs a face as its poster. */
  video?: string;
  links: { demo?: string; github?: string; story?: string };
  visibility: { code: (typeof CODE_VISIBILITIES)[number]; can_show?: string; cannot_show?: string };
  /** Required for featured and in-progress; archive projects are one line. */
  story?: ProjectStory;
};

export type ProjectResult = { ok: true; project: Project } | { ok: false; message: string };

export const SUMMARY_MAX_CHARS = 120;
export const STACK_MAX_ITEMS = 5;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function optionalString(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || isNonEmptyString(record[key]);
}

export function validateProject(slug: string, data: unknown): ProjectResult {
  const fail = (message: string): ProjectResult => ({ ok: false, message: `${slug}: ${message}` });

  if (!isRecord(data)) {
    return fail("Expected a YAML object at root");
  }

  for (const key of ["title", "thread", "role", "proves"] as const) {
    if (!isNonEmptyString(data[key])) {
      return fail(`Missing or empty required field: ${key}`);
    }
  }

  if (!isNonEmptyString(data.summary) || data.summary.length > SUMMARY_MAX_CHARS) {
    return fail(`summary must be one sentence of at most ${SUMMARY_MAX_CHARS} characters`);
  }

  if (!optionalString(data, "why")) {
    return fail("why must be a non-empty string when provided");
  }

  if (!oneOf(data.tier, PROJECT_TIERS)) {
    return fail(`tier must be one of: ${PROJECT_TIERS.join(", ")}`);
  }

  if (typeof data.order !== "number" || !Number.isInteger(data.order) || data.order < 1) {
    return fail("order must be a whole number from 1");
  }

  const status = data.status;
  if (!isRecord(status)) {
    return fail("Missing or invalid required field: status");
  }
  if (!oneOf(status.state, PROJECT_STATES)) {
    return fail(`status.state must be one of: ${PROJECT_STATES.join(", ")}`);
  }
  // YAML reads an unquoted 2026-11-14 as a Date, so accept both and store the string.
  const asOf = status.as_of instanceof Date ? status.as_of.toISOString().slice(0, 10) : status.as_of;
  if (!isNonEmptyString(asOf) || !ISO_DATE_PATTERN.test(asOf)) {
    return fail("status.as_of must be a date like 2026-11-14");
  }
  if (!optionalString(status, "note")) {
    return fail("status.note must be a non-empty string when provided");
  }

  if (!isNonEmptyString(data.dates) || !DATE_RANGE_PATTERN.test(data.dates)) {
    return fail(`dates must look like ${DATE_RANGE_HINT}`);
  }

  if (!isStringArray(data.stack) || data.stack.length > STACK_MAX_ITEMS) {
    return fail(`stack must list 1 to ${STACK_MAX_ITEMS} items`);
  }

  if (!isStringArray(data.proof)) {
    return fail("proof must be a non-empty array of verifiable facts");
  }

  if (data.face !== undefined && !isNonEmptyString(data.face)) {
    return fail("face must be a file path when provided");
  }

  if (data.video !== undefined) {
    if (!isNonEmptyString(data.video) || !data.video.endsWith(".webm")) {
      return fail("video must be a .webm file path when provided");
    }
    if (data.face === undefined) {
      return fail("video needs a face, which is shown as its poster");
    }
  }

  const links = data.links ?? {};
  if (!isRecord(links)) {
    return fail("links must be an object when provided");
  }
  for (const key of ["demo", "github", "story"] as const) {
    if (links[key] !== undefined && !isHttpsUrl(links[key])) {
      return fail(`links.${key} must be an https:// URL when provided`);
    }
  }

  const visibility = data.visibility;
  if (!isRecord(visibility) || !oneOf(visibility.code, CODE_VISIBILITIES)) {
    return fail(`visibility.code must be one of: ${CODE_VISIBILITIES.join(", ")}`);
  }
  if (!optionalString(visibility, "can_show") || !optionalString(visibility, "cannot_show")) {
    return fail("visibility.can_show and cannot_show must be non-empty strings when provided");
  }
  // A private project must never link its code, and a public one must.
  if (visibility.code === "private" && links.github !== undefined) {
    return fail("links.github must be left out when visibility.code is private");
  }
  if (visibility.code === "public" && links.github === undefined) {
    return fail("links.github is required when visibility.code is public");
  }

  const story = data.story;
  if (story !== undefined || data.tier !== "archive") {
    if (!isRecord(story)) {
      return fail("story is required for featured and in-progress projects");
    }
    for (const part of STORY_PARTS) {
      if (!isNonEmptyString(story[part])) {
        return fail(`Missing or empty required field: story.${part}`);
      }
    }
  }

  return {
    ok: true,
    project: {
      ...(data as Omit<Project, "slug">),
      slug,
      links: links as Project["links"],
      status: { ...(status as Project["status"]), as_of: asOf },
    },
  };
}

/**
 * Rules that need every project at once: each thread exists in the spine,
 * no two projects share a place in a tier, and no two featured projects
 * claim to prove the same thing (each one has to earn its slot).
 */
export function validateProjectSet(
  projects: Project[],
  threadIds: string[],
): { ok: true } | { ok: false; message: string } {
  const places = new Set<string>();
  const featuredProves = new Map<string, string>();

  for (const project of projects) {
    if (!threadIds.includes(project.thread)) {
      return {
        ok: false,
        message: `${project.slug}: thread "${project.thread}" is not in profile.yaml threads (${threadIds.join(", ")})`,
      };
    }

    const place = `${project.tier}#${project.order}`;
    if (places.has(place)) {
      return { ok: false, message: `${project.slug}: another ${project.tier} project already has order ${project.order}` };
    }
    places.add(place);

    if (project.tier === "featured") {
      const key = project.proves.trim().toLowerCase();
      const other = featuredProves.get(key);
      if (other) {
        return { ok: false, message: `${project.slug}: proves the same thing as ${other} ("${project.proves}")` };
      }
      featuredProves.set(key, project.slug);
    }
  }

  return { ok: true };
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
