import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { type HomeText, parseChapteredFile, parseHomeFile, parseStoryFile, type StoryText } from "@/lib/site-text";

const CONTENT_DIR = resolve(process.cwd(), "content");

function load<T>(fileName: string, parse: (text: string) => { ok: true; value: T } | { ok: false; message: string }): T {
  const path = resolve(CONTENT_DIR, fileName);
  const result = parse(readFileSync(path, "utf8"));
  if (!result.ok) {
    throw new Error(`Invalid ${path}: ${result.message}`);
  }
  return result.value;
}

/** Throws on a bad file, so the build fails instead of rendering a broken page. */
export function getHomeText(): HomeText {
  return load("home.md", parseHomeFile);
}

export function getStoryText(): StoryText {
  return load("story.md", parseStoryFile);
}

/** content/ask.md: the "How this works" page for the Ask box. */
export function getAskPageText(): StoryText {
  return load("ask.md", (text) => parseChapteredFile(text, "ask.md"));
}
