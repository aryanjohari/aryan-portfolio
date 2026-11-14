#!/usr/bin/env tsx
/**
 * Builds the Ask box's search index from content/: the public sections and,
 * when GEMINI_API_KEY is set, one embedding per section. Without a key the
 * index has no vectors and the Ask route searches by keyword instead, so
 * local builds and CI never need a key. Output is gitignored.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { embedTexts, askSettings } from "../src/lib/ask/gemini";
import { type AskIndex, buildAskSections } from "../src/lib/ask/sections";
import { getProfile } from "../src/lib/profile";
import { getProjects } from "../src/lib/projects";
import { getHomeText, getStoryText } from "../src/lib/site-text-files";

const OUTPUT = resolve(process.cwd(), "src/lib/generated/ask-index.json");
/** Gemini's batch embedding call takes at most 100 texts. */
const BATCH_SIZE = 100;

async function embedAll(texts: string[], apiKey: string, model: string): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = await embedTexts(texts.slice(start, start + BATCH_SIZE), "RETRIEVAL_DOCUMENT", { apiKey, model, timeoutMs: 60_000 });
    // 5 decimals keeps ranking identical and the file about half the size.
    vectors.push(...batch.map((vector) => vector.map((value) => Math.round(value * 1e5) / 1e5)));
  }
  return vectors;
}

async function main() {
  const profile = getProfile();
  const projects = getProjects();
  const sections = buildAskSections({ profile, projects, home: getHomeText(), story: getStoryText() });

  const { apiKey, embeddingModel } = askSettings();
  let vectors: number[][] | null = null;
  if (apiKey) {
    vectors = await embedAll(
      sections.map((section) => `${section.title}\n${section.text}`),
      apiKey,
      embeddingModel,
    );
  } else {
    console.warn("GEMINI_API_KEY not set: Ask index built without embeddings (keyword search only).");
  }

  const index: AskIndex = {
    builtAt: new Date().toISOString(),
    embeddingModel: vectors ? embeddingModel : null,
    sections,
    vectors,
    demos: projects.flatMap((project) =>
      project.links.demo ? [{ slug: project.slug, title: project.title, url: project.links.demo }] : [],
    ),
    contactEmail: profile.links.email,
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(index)}\n`);
  console.log(`Wrote ${sections.length} Ask sections${vectors ? ` with ${embeddingModel} embeddings` : ""} to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
