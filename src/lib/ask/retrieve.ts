/**
 * Picks the few sections worth sending with a question. Embedding search
 * (by meaning) is the normal path; keyword search is the fallback when the
 * index has no vectors or the question can't be embedded. Pure.
 */

import type { AskSection } from "./sections";

export type PickOptions = { limit: number };

/** How many sections go with each question, on top of the short index of all of them. */
export const SECTIONS_PER_QUESTION = 4;

/**
 * Calibrated 15 Nov 2026 on gemini-embedding-2 (768 dims) with real questions:
 * real matches scored 0.63–0.72, off-topic ones ("weather in Paris", "your phone
 * number") 0.51–0.58. Re-check if the embedding model changes.
 */
export const MIN_EMBEDDING_SCORE = 0.6;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

/** The closest sections by meaning, best first, keeping only those at least `minScore` similar. */
export function pickByEmbedding(
  questionVector: number[],
  vectors: number[][],
  sections: AskSection[],
  { limit, minScore }: PickOptions & { minScore: number },
): AskSection[] {
  return sections
    .map((section, index) => ({ section, score: cosineSimilarity(questionVector, vectors[index]) }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.section);
}

/** Common words that would match every section and say nothing about the question. */
const FILLER_WORDS = new Set(
  "a an and are about can could did do does for from have has he him his how i in is it me my of on or so tell that the this to was what when where which who why with you your".split(" "),
);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => word.length > 1 && !FILLER_WORDS.has(word));
}

/** Sections sharing words with the question; a word in the title counts three times. Empty when nothing matches. */
export function pickByKeywords(question: string, sections: AskSection[], { limit }: PickOptions): AskSection[] {
  const questionWords = new Set(words(question));
  return sections
    .map((section) => {
      const titleWords = words(section.title);
      const textWords = words(section.text);
      let score = 0;
      for (const word of questionWords) {
        score += 3 * titleWords.filter((w) => w === word).length + textWords.filter((w) => w === word).length;
      }
      return { section, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.section);
}
