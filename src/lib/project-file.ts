/**
 * Reads one content/projects/<slug>.md: YAML frontmatter holds the facts, and
 * the Markdown body holds the story as "## " sections (docs/V2_PLAN.md §15).
 * Pure: the caller reads the file.
 */

import { parse } from "yaml";

import { type ProjectResult, STORY_HEADINGS, type StoryPart, validateProject } from "./portfolio-schema";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(text: string): { ok: true; data: unknown; body: string } | { ok: false; message: string } {
  const match = FRONTMATTER_PATTERN.exec(text);
  if (!match) {
    return { ok: false, message: "File must start with a --- frontmatter block that ends with ---" };
  }
  return { ok: true, data: parse(match[1]), body: match[2] };
}

const PART_BY_HEADING = new Map(
  (Object.entries(STORY_HEADINGS) as [StoryPart, string][]).map(([part, heading]) => [heading.toLowerCase(), part]),
);

/** Splits the body on "## Heading" lines; any text before the first heading is an error, not silently dropped. */
export function parseStorySections(
  body: string,
): { ok: true; sections: Partial<Record<StoryPart, string>> } | { ok: false; message: string } {
  const sections: Partial<Record<StoryPart, string>> = {};
  const chunks = body.split(/^## +/m);

  if (chunks[0].trim().length > 0) {
    return { ok: false, message: "Story text must sit under a ## heading" };
  }

  for (const chunk of chunks.slice(1)) {
    const newline = chunk.indexOf("\n");
    const heading = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    const part = PART_BY_HEADING.get(heading.toLowerCase());
    if (!part) {
      const allowed = Object.values(STORY_HEADINGS).join(", ");
      return { ok: false, message: `Unknown story heading "## ${heading}" (use one of: ${allowed})` };
    }
    if (sections[part] !== undefined) {
      return { ok: false, message: `Story heading "## ${heading}" appears twice` };
    }
    sections[part] = newline === -1 ? "" : chunk.slice(newline + 1).trim();
  }

  return { ok: true, sections };
}

export function parseProjectFile(slug: string, text: string): ProjectResult {
  const fail = (message: string): ProjectResult => ({ ok: false, message: `${slug}: ${message}` });

  const file = splitFrontmatter(text);
  if (!file.ok) return fail(file.message);

  const story = parseStorySections(file.body);
  if (!story.ok) return fail(story.message);

  if (file.data !== null && typeof file.data === "object" && "story" in file.data) {
    return fail("story goes in the Markdown body as ## sections, not in the frontmatter");
  }

  const hasStory = Object.keys(story.sections).length > 0;
  const data = file.data !== null && typeof file.data === "object" ? file.data : {};
  return validateProject(slug, hasStory ? { ...data, story: story.sections } : data);
}
