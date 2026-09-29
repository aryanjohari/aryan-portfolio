/**
 * Blog content contract.
 *
 * Files: `content/blog/*.md` (slug is the filename without `.md`).
 * Each file is YAML frontmatter plus a markdown body.
 *
 * Required frontmatter:
 * - title: string
 * - question: string
 * - description: string
 * - published: YYYY-MM-DD
 * - modified: YYYY-MM-DD
 * - fill: build-log | lesson | researched
 * - source: string (kept, not rendered)
 * - canonical: path, must be `/blog/{slug}`
 *
 * Missing directory or zero markdown files is an empty blog, not an error.
 * A file that breaks this contract fails the build.
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export const BLOG_FILLS = ["build-log", "lesson", "researched"] as const;

export type BlogFill = (typeof BLOG_FILLS)[number];

export type BlogPost = {
  slug: string;
  title: string;
  question: string;
  description: string;
  /** Calendar date, YYYY-MM-DD. */
  published: string;
  /** Calendar date, YYYY-MM-DD. */
  modified: string;
  fill: BlogFill;
  source: string;
  /** Self-referential site path: `/blog/{slug}`. */
  canonical: string;
  /** Markdown body, frontmatter removed. */
  body: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBlogFill(value: string): value is BlogFill {
  return (BLOG_FILLS as readonly string[]).includes(value);
}

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function requiredText(
  record: Record<string, unknown>,
  key: string,
  file: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${file}: ${key} must be a non-empty string`);
  }
  return value.trim();
}

function asIsoDate(value: unknown, key: string, file: string): string {
  let raw: string | undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    raw = `${year}-${month}-${day}`;
  } else if (typeof value === "string") {
    raw = value.trim().slice(0, 10);
  }
  if (!raw || !isRealIsoDate(raw)) {
    throw new Error(`${file}: ${key} must be a YYYY-MM-DD date`);
  }
  return raw;
}

function splitFrontmatter(
  raw: string,
  file: string,
): { data: unknown; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match?.[1]) {
    throw new Error(`${file}: missing YAML frontmatter`);
  }
  let data: unknown;
  try {
    data = parse(match[1]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid YAML";
    throw new Error(`${file}: ${message}`);
  }
  return { data, body: (match[2] ?? "").trim() };
}

function readPostFile(fileName: string): BlogPost {
  const slug = fileName.slice(0, -".md".length);
  if (!slug || slug === "." || slug === "..") {
    throw new Error(`${fileName}: invalid slug`);
  }

  const fullPath = path.join(BLOG_DIR, fileName);
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`${fileName}: not a file`);
  }

  const { data, body } = splitFrontmatter(
    fs.readFileSync(fullPath, "utf8"),
    fileName,
  );
  if (!isRecord(data)) {
    throw new Error(`${fileName}: frontmatter must be a YAML mapping`);
  }

  const title = requiredText(data, "title", fileName);
  const question = requiredText(data, "question", fileName);
  const description = requiredText(data, "description", fileName);
  const published = asIsoDate(data.published, "published", fileName);
  const modified = asIsoDate(data.modified, "modified", fileName);
  const fillValue = data.fill;
  if (typeof fillValue !== "string" || !isBlogFill(fillValue)) {
    throw new Error(
      `${fileName}: fill must be build-log, lesson, or researched`,
    );
  }
  const source = requiredText(data, "source", fileName);
  const canonical = requiredText(data, "canonical", fileName);
  const expectedCanonical = `/blog/${slug}`;
  if (canonical !== expectedCanonical) {
    throw new Error(`${fileName}: canonical must be ${expectedCanonical}`);
  }

  return {
    slug,
    title,
    question,
    description,
    published,
    modified,
    fill: fillValue,
    source,
    canonical,
    body,
  };
}

/** Readable calendar date, e.g. `29 Sep 2026`. */
export function formatBlogDate(isoDate: string): string {
  const month = MONTHS[Number(isoDate.slice(5, 7)) - 1] ?? "";
  const day = Number(isoDate.slice(8, 10));
  const year = isoDate.slice(0, 4);
  return `${day} ${month} ${year}`;
}

/** Posts newest-published first. Empty when `content/blog` has no markdown. */
export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const names = fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md") && !name.startsWith("."));
  const posts = names.map(readPostFile);
  posts.sort((a, b) => {
    if (a.published !== b.published) {
      return a.published < b.published ? 1 : -1;
    }
    if (a.slug === b.slug) return 0;
    return a.slug < b.slug ? -1 : 1;
  });
  return posts;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}
