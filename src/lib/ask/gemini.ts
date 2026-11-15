/**
 * The only file that talks to Gemini: one call to embed texts, one to get a
 * JSON answer. Plain fetch, no SDK. The key goes in a header so it never
 * lands in a URL or a log line.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 15_000;
/** 768 is plenty for ~60 short sections and keeps the index file small. */
const EMBEDDING_DIMENSIONS = 768;

export const DEFAULT_ANSWER_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";

export type GeminiConfig = { apiKey: string; model: string; timeoutMs?: number };
export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Reads the Ask settings from the environment; no key means the Ask box is off. */
export function askSettings(env: Record<string, string | undefined> = process.env) {
  return {
    apiKey: env.GEMINI_API_KEY?.trim() || undefined,
    answerModel: env.GEMINI_MODEL?.trim() || DEFAULT_ANSWER_MODEL,
    embeddingModel: env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL,
  };
}

async function post(call: string, body: unknown, { apiKey, timeoutMs = DEFAULT_TIMEOUT_MS }: GeminiConfig): Promise<unknown> {
  const response = await fetch(`${API_BASE}/${call}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(`Gemini ${call} failed (${response.status}): ${data.error?.message ?? "no message"}`);
  }
  return data;
}

export async function embedTexts(texts: string[], task: EmbeddingTask, config: GeminiConfig): Promise<number[][]> {
  const data = (await post(
    `${config.model}:batchEmbedContents`,
    {
      requests: texts.map((text) => ({
        model: `models/${config.model}`,
        content: { parts: [{ text }] },
        taskType: task,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    },
    config,
  )) as { embeddings?: { values?: unknown }[] };

  const vectors = (data.embeddings ?? []).map((embedding) => embedding.values);
  if (vectors.length !== texts.length) {
    throw new Error(`Gemini embedding reply: expected ${texts.length} embeddings, got ${vectors.length}`);
  }
  if (!vectors.every((vector) => Array.isArray(vector) && vector.every((value) => typeof value === "number"))) {
    throw new Error("Gemini embedding reply: a vector is not a list of numbers");
  }
  return vectors as number[][];
}

/** Asks for an answer in the given JSON shape and returns it parsed; the caller checks its contents. */
export async function generateJson(
  systemPrompt: string,
  userText: string,
  responseSchema: object,
  config: GeminiConfig & { maxOutputTokens?: number },
): Promise<unknown> {
  const data = (await post(
    `${config.model}:generateContent`,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        // Low: answers should stick to the sections, not vary for style.
        temperature: 0.2,
        maxOutputTokens: config.maxOutputTokens ?? 600,
        responseMimeType: "application/json",
        responseSchema,
      },
    },
    config,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini answer reply: no text in the first candidate");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini answer reply: the text is not valid JSON");
  }
}
