/** A Markdown file with a YAML frontmatter block, the shape of every long-text file in content/. */

import { parse } from "yaml";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(text: string): { ok: true; data: unknown; body: string } | { ok: false; message: string } {
  const match = FRONTMATTER_PATTERN.exec(text);
  if (!match) {
    return { ok: false, message: "File must start with a --- frontmatter block that ends with ---" };
  }
  return { ok: true, data: parse(match[1]), body: match[2] };
}
