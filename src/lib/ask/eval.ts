/**
 * Scoring for the Ask box's test questions (run by scripts/eval-ask.ts).
 * Automatic checks only cover what code can judge: the right sections were
 * found, the answer cites them, the expected action is offered, and nothing
 * forbidden appears. Whether an answer is true and useful is judged by
 * reading it; the results file shows every answer for that. Pure.
 */

import type { AskAction, AskReply } from "./answer";

export type EvalCase = {
  id: string;
  question: string;
  /** "answer": should answer from the site; "decline": should say it can't, citing nothing. */
  expect: "answer" | "decline";
  /** Section id prefixes that count as the right source, e.g. "pii-gateway#". */
  sections?: string[];
  /** An action kind the answer should offer. */
  action?: AskAction["kind"];
  /** Text that must never appear in the answer (ignoring case). */
  forbid?: string[];
  /** The page the visitor is reading when they ask, e.g. "/projects/prism". */
  page?: string;
};

export type ReplyScore = { sources: boolean; action: boolean; forbidden: boolean; pass: boolean };

const matchesAny = (id: string, prefixes: string[]) => prefixes.some((prefix) => id.startsWith(prefix));

/** Did the search find a right section? null when the case names none (declines). */
export function retrievalHit(pickedIds: string[], expected: string[] | undefined): boolean | null {
  if (!expected) return null;
  return pickedIds.some((id) => matchesAny(id, expected));
}

export function scoreReply(reply: AskReply, evalCase: EvalCase): ReplyScore {
  const sources =
    evalCase.expect === "decline"
      ? reply.sources.length === 0
      : !evalCase.sections || reply.sources.some((source) => matchesAny(source.id, evalCase.sections ?? []));
  const action = !evalCase.action || reply.actions.some((item) => item.kind === evalCase.action);
  const answer = reply.answer.toLowerCase();
  const forbidden = (evalCase.forbid ?? []).every((text) => !answer.includes(text.toLowerCase()));
  return { sources, action, forbidden, pass: sources && action && forbidden };
}
