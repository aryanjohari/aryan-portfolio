/**
 * The browser side of the Ask box: posts a question to /api/ask and checks
 * the reply's shape before the page renders it. Every failure becomes one
 * short message, so the UI has exactly two cases to show.
 */

import type { AskAction, AskReply, AskSource } from "./answer";

export type AskResult = { ok: true; reply: AskReply } | { ok: false; message: string };

const GENERIC_FAILURE = "Something went wrong. Try again, or email Aryan.";
const ACTION_KINDS: AskAction["kind"][] = ["page", "demo", "email"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function toSource(raw: unknown): AskSource | undefined {
  if (!isRecord(raw) || !isString(raw.id) || !isString(raw.title) || !isString(raw.url)) return undefined;
  return { id: raw.id, title: raw.title, url: raw.url };
}

function toAction(raw: unknown): AskAction | undefined {
  if (!isRecord(raw) || !isString(raw.label) || !isString(raw.href)) return undefined;
  if (!ACTION_KINDS.includes(raw.kind as AskAction["kind"])) return undefined;
  return { kind: raw.kind as AskAction["kind"], label: raw.label, href: raw.href };
}

function toReply(data: unknown): AskReply | undefined {
  if (!isRecord(data) || !isString(data.answer)) return undefined;
  const list = (value: unknown) => (Array.isArray(value) ? value : []);
  return {
    answer: data.answer,
    sources: list(data.sources).map(toSource).filter((source) => source !== undefined),
    actions: list(data.actions).map(toAction).filter((action) => action !== undefined),
  };
}

/** `page` is the path the visitor is reading, so "this project" can mean that page. */
export async function askQuestion(question: string, page?: string): Promise<AskResult> {
  let response: Response;
  try {
    response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, page }),
    });
  } catch {
    return { ok: false, message: "Couldn't reach the site. Check your connection and try again." };
  }

  if (response.status === 429) {
    return { ok: false, message: "Too many questions at once. Try again in a minute." };
  }

  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    return { ok: false, message: isRecord(data) && isString(data.error) ? data.error : GENERIC_FAILURE };
  }

  const reply = toReply(data);
  return reply ? { ok: true, reply } : { ok: false, message: GENERIC_FAILURE };
}
