#!/usr/bin/env tsx
/**
 * Runs the Ask box's test questions against the real models and writes a
 * results file to evals/ask/<date>-<label>.md: keyword vs embedding search
 * hit rates, the automatic checks, latency, and every answer to read.
 * Needs GEMINI_API_KEY and a built index:
 *   npx tsx --env-file=.env.local scripts/build-ask-index.ts
 *   npx tsx --env-file=.env.local scripts/eval-ask.ts baseline
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AskReply } from "../src/lib/ask/answer";
import { type EvalCase, retrievalHit, scoreReply } from "../src/lib/ask/eval";
import { EVAL_CASES } from "../src/lib/ask/eval-cases";
import { askSettings, embedTexts } from "../src/lib/ask/gemini";
import { handleAsk } from "../src/lib/ask/handle";
import { MIN_EMBEDDING_SCORE, pickByEmbedding, pickByKeywords, SECTIONS_PER_QUESTION } from "../src/lib/ask/retrieve";
import type { AskIndex } from "../src/lib/ask/sections";

const label = process.argv[2] ?? "run";
const index = JSON.parse(readFileSync(resolve("src/lib/generated/ask-index.json"), "utf8")) as AskIndex;
const settings = askSettings();
if (!settings.apiKey || !index.vectors || !index.embeddingModel) {
  console.error("Needs GEMINI_API_KEY and an index built with embeddings (see the header of this file).");
  process.exit(1);
}

const percent = (hits: number, total: number) => `${hits}/${total} (${Math.round((100 * hits) / total)}%)`;
const mark = (ok: boolean | null) => (ok === null ? "–" : ok ? "✓" : "✗");
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

async function main() {
  const questionVectors = await embedTexts(
    EVAL_CASES.map((item) => item.question),
    "RETRIEVAL_QUERY",
    { apiKey: settings.apiKey!, model: index.embeddingModel! },
  );

  const rows: { evalCase: EvalCase; keyword: boolean | null; embedding: boolean | null; reply?: AskReply; error?: string; ms: number }[] = [];
  for (const [i, evalCase] of EVAL_CASES.entries()) {
    const keywordIds = pickByKeywords(evalCase.question, index.sections, { limit: SECTIONS_PER_QUESTION }).map((s) => s.id);
    const embeddingIds = pickByEmbedding(questionVectors[i], index.vectors!, index.sections, {
      limit: SECTIONS_PER_QUESTION,
      minScore: MIN_EMBEDDING_SCORE,
    }).map((s) => s.id);

    const started = Date.now();
    const result = await handleAsk({ question: evalCase.question, page: evalCase.page }, index, settings);
    const ms = Date.now() - started;
    rows.push({
      evalCase,
      keyword: retrievalHit(keywordIds, evalCase.sections),
      embedding: retrievalHit(embeddingIds, evalCase.sections),
      ...(result.status === 200 ? { reply: result.body as AskReply } : { error: (result.body as { error: string }).error }),
      ms,
    });
  }

  const withSections = rows.filter((row) => row.embedding !== null);
  const scores = rows.map((row) => (row.reply ? scoreReply(row.reply, row.evalCase) : undefined));
  const passed = scores.filter((score) => score?.pass).length;
  const medianMs = [...rows.map((row) => row.ms)].sort((a, b) => a - b)[Math.floor(rows.length / 2)];

  const lines = [
    `# Ask box test run: ${label}`,
    "",
    `${new Date().toISOString().slice(0, 10)} · answer model \`${settings.answerModel}\` · embeddings \`${index.embeddingModel}\` · ${index.sections.length} sections · ${EVAL_CASES.length} questions`,
    "",
    "| | |",
    "|---|---|",
    `| Right section found, keyword search | ${percent(withSections.filter((row) => row.keyword).length, withSections.length)} |`,
    `| Right section found, embedding search | ${percent(withSections.filter((row) => row.embedding).length, withSections.length)} |`,
    `| Automatic checks passed (sources, action, nothing forbidden) | ${percent(passed, rows.length)} |`,
    `| Median time per answer | ${(medianMs / 1000).toFixed(1)} s |`,
    "",
    "Automatic checks can't tell whether an answer is true or useful; read the answers below for that.",
    "",
    "| Question | Keyword | Embedding | Sources | Action | Forbidden | Answer |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((row, i) => {
      const score = scores[i];
      const answer = row.reply
        ? `${row.reply.answer}${row.reply.sources.length ? ` _(from: ${row.reply.sources.map((s) => s.id).join(", ")})_` : ""}${row.reply.actions.length ? ` _[${row.reply.actions.map((a) => a.kind).join(", ")}]_` : ""}`
        : `ERROR: ${row.error}`;
      return `| ${cell(row.evalCase.question)} | ${mark(row.keyword)} | ${mark(row.embedding)} | ${mark(score?.sources ?? false)} | ${mark(score?.action ?? false)} | ${mark(score?.forbidden ?? false)} | ${cell(answer)} |`;
    }),
    "",
  ];

  const output = resolve(`evals/ask/${new Date().toISOString().slice(0, 10)}-${label}.md`);
  writeFileSync(output, lines.join("\n"));
  console.log(lines.slice(4, 10).join("\n"));
  console.log(`Wrote ${output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
