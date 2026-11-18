/**
 * One Ask request, start to finish: check the question, pick sections (by
 * meaning, or keywords as a fallback), ask Gemini for an answer in a fixed
 * shape, check that answer. The route only adds HTTP around this, so it can
 * be tested without Next or the generated index.
 */

import { type AskReply, ANSWER_SCHEMA, checkAnswer, parseQuestion } from "./answer";
import { type askSettings, embedTexts, generateJson } from "./gemini";
import { buildUserText, SYSTEM_PROMPT } from "./prompt";
import { MIN_EMBEDDING_SCORE, pagePath, pickByEmbedding, pickByKeywords, SECTIONS_PER_QUESTION, withPageFirst } from "./retrieve";
import type { AskIndex, AskSection } from "./sections";

export type AskResponse = AskReply & { retrieval: "embedding" | "keyword" };
type AskSettings = ReturnType<typeof askSettings>;

const RETRY_MESSAGE = "The Ask box couldn't answer just now. Try again in a minute, or email Aryan.";

async function pickSections(
  question: string,
  index: AskIndex,
  apiKey: string,
): Promise<{ picked: AskSection[]; retrieval: AskResponse["retrieval"] }> {
  if (index.vectors && index.embeddingModel) {
    try {
      // The question must use the same model as the sections, or the scores mean nothing.
      const [questionVector] = await embedTexts([question], "RETRIEVAL_QUERY", { apiKey, model: index.embeddingModel, timeoutMs: 5_000 });
      const picked = pickByEmbedding(questionVector, index.vectors, index.sections, {
        limit: SECTIONS_PER_QUESTION,
        minScore: MIN_EMBEDDING_SCORE,
      });
      return { picked, retrieval: "embedding" };
    } catch (error) {
      console.error(`Ask: embedding failed, using keywords: ${error instanceof Error ? error.message : error}`);
    }
  }
  return { picked: pickByKeywords(question, index.sections, { limit: SECTIONS_PER_QUESTION }), retrieval: "keyword" };
}

export async function handleAsk(
  body: unknown,
  index: AskIndex,
  settings: AskSettings,
): Promise<{ status: number; body: AskResponse | { error: string } }> {
  const parsed = parseQuestion(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.message } };
  if (!settings.apiKey) return { status: 503, body: { error: "The Ask box is switched off." } };

  // The page comes from the visitor's browser, so it only counts if the site really has it.
  const pageSection = parsed.page ? index.sections.find((section) => pagePath(section.url) === parsed.page) : undefined;
  const page = pageSection && { path: pagePath(pageSection.url), title: pageSection.title };

  const { picked, retrieval } = await pickSections(parsed.question, index, settings.apiKey);
  const sections = withPageFirst(picked, index.sections, page?.path, SECTIONS_PER_QUESTION);
  const userText = buildUserText(parsed.question, index.sections, sections, index.demos, page);

  let raw: unknown;
  try {
    raw = await generateJson(SYSTEM_PROMPT, userText, ANSWER_SCHEMA, { apiKey: settings.apiKey, model: settings.answerModel });
  } catch (error) {
    // Log what failed, never the visitor's question.
    console.error(`Ask: answer call failed: ${error instanceof Error ? error.message : error}`);
    return { status: 502, body: { error: RETRY_MESSAGE } };
  }

  const checked = checkAnswer(raw, { sections: index.sections, demos: index.demos, contactEmail: index.contactEmail });
  if (!checked.ok) {
    console.error("Ask: the model's answer had no usable text");
    return { status: 502, body: { error: RETRY_MESSAGE } };
  }
  return { status: 200, body: { ...checked.reply, retrieval } };
}
