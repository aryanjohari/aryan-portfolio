/**
 * The site's longer words: content/home.md (headline + short bio) and
 * content/story.md (the long story in chapters), content/ask.md (how the Ask
 * box works, same shape as the story). Pure parsers; file reads
 * live in site-text-files.ts.
 */

import { splitFrontmatter } from "./markdown-file";
import { isNonEmptyString, isRecord } from "./schema-helpers";

export type HomeText = { headline: string; bio: string };

export type StoryChapter = {
  title: string;
  /** Optional first line in italics, e.g. "*Mumbai · 2021 – 2024*". */
  label?: string;
  body: string;
};

export type StoryText = { title: string; summary: string; chapters: StoryChapter[] };

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export function parseHomeFile(text: string): Result<HomeText> {
  const file = splitFrontmatter(text);
  if (!file.ok) return file;
  if (!isRecord(file.data) || !isNonEmptyString(file.data.headline)) {
    return { ok: false, message: "home.md needs a headline in its frontmatter" };
  }
  const bio = file.body.trim();
  if (bio.length === 0) {
    return { ok: false, message: "home.md needs the short bio as its body" };
  }
  return { ok: true, value: { headline: file.data.headline, bio } };
}

const LABEL_PATTERN = /^\*([^*\n]+)\*\s*(?:\n|$)/;

/** Parses the long story; see parseChapteredFile. */
export function parseStoryFile(text: string): Result<StoryText> {
  return parseChapteredFile(text, "story.md");
}

/**
 * A page of `## ` chapters under a title and summary: content/story.md and
 * content/ask.md share this shape. `fileName` only names the file in errors.
 */
export function parseChapteredFile(text: string, fileName: string): Result<StoryText> {
  const file = splitFrontmatter(text);
  if (!file.ok) return file;
  if (!isRecord(file.data) || !isNonEmptyString(file.data.title) || !isNonEmptyString(file.data.summary)) {
    return { ok: false, message: `${fileName} needs a title and a summary in its frontmatter` };
  }

  const chunks = file.body.split(/^## +/m);
  if (chunks[0].trim().length > 0) {
    return { ok: false, message: `${fileName} text must sit under a ## chapter heading` };
  }

  const chapters: StoryChapter[] = [];
  for (const chunk of chunks.slice(1)) {
    const newline = chunk.indexOf("\n");
    const title = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    let rest = newline === -1 ? "" : chunk.slice(newline + 1).trim();

    const label = LABEL_PATTERN.exec(rest);
    if (label) rest = rest.slice(label[0].length).trim();

    if (rest.length === 0) {
      return { ok: false, message: `${fileName} chapter "${title}" is empty` };
    }
    chapters.push(label ? { title, label: label[1].trim(), body: rest } : { title, body: rest });
  }

  if (chapters.length === 0) {
    return { ok: false, message: `${fileName} needs at least one ## chapter` };
  }
  return { ok: true, value: { title: file.data.title, summary: file.data.summary, chapters } };
}

/** "Mumbai · 2021 – 2024" → place "Mumbai", when "2021 – 2024"; a label without " · " is all place. */
export function splitChapterLabel(label: string | undefined): { place?: string; when?: string } {
  if (label === undefined) return {};
  const separator = label.indexOf(" · ");
  if (separator === -1) return { place: label };
  return { place: label.slice(0, separator), when: label.slice(separator + 3) };
}
