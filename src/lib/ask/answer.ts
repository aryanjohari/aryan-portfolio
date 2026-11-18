/**
 * The Ask box's two boundaries: the visitor's question coming in, and the
 * model's answer going out. The model can only name things (a section id, a
 * project slug); every link the visitor sees is built here from the index,
 * so a made-up page, demo or email recipient never reaches the page. Pure.
 */

import type { AskSection } from "./sections";

export const QUESTION_MAX_CHARS = 300;
const ANSWER_MAX_CHARS = 1200;
const MAX_SOURCES = 3;
const MAX_ACTIONS = 3;
const EMAIL_SUBJECT_MAX_CHARS = 120;
const EMAIL_BODY_MAX_CHARS = 1000;

export type AskSource = Pick<AskSection, "id" | "title" | "url">;
export type AskAction =
  | { kind: "page"; label: string; href: string }
  | { kind: "demo"; label: string; href: string }
  | { kind: "email"; label: string; href: string };
export type AskReply = { answer: string; sources: AskSource[]; actions: AskAction[] };

export type AllowedTargets = {
  sections: AskSection[];
  demos: { slug: string; title: string; url: string }[];
  contactEmail: string;
};

/** The JSON shape Gemini must answer in (its responseSchema format). */
export const ANSWER_SCHEMA = {
  type: "OBJECT",
  properties: {
    answer: { type: "STRING" },
    sources: { type: "ARRAY", items: { type: "STRING" } },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["open_page", "open_demo", "draft_email"] },
          target: { type: "STRING" },
          subject: { type: "STRING" },
          body: { type: "STRING" },
        },
        required: ["type"],
      },
    },
  },
  required: ["answer", "sources", "actions"],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const PAGE_MAX_CHARS = 100;

export function parseQuestion(
  body: unknown,
): { ok: true; question: string; page?: string } | { ok: false; message: string } {
  const raw = isRecord(body) ? body.question : undefined;
  if (typeof raw !== "string") return { ok: false, message: "Send a question as text." };
  const question = raw.replace(/\s+/g, " ").trim();
  if (question.length === 0) return { ok: false, message: "The question is empty." };
  if (question.length > QUESTION_MAX_CHARS) {
    return { ok: false, message: `Keep the question under ${QUESTION_MAX_CHARS} characters.` };
  }
  // Only shaped like a site path here; handle.ts keeps it only if the site has that page.
  const page = isRecord(body) ? body.page : undefined;
  const isPath = typeof page === "string" && page.startsWith("/") && page.length <= PAGE_MAX_CHARS;
  return isPath ? { ok: true, question, page } : { ok: true, question };
}

/** Plain text only, cut to a length: drops control characters except new lines. */
function cleanText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\P{Cc}\n]/gu, "").trim().slice(0, maxChars);
}

function toAction(raw: unknown, allowed: AllowedTargets): AskAction | undefined {
  if (!isRecord(raw)) return undefined;

  if (raw.type === "open_page") {
    const section = allowed.sections.find((item) => item.id === raw.target);
    return section && { kind: "page", label: `Open ${section.title}`, href: section.url };
  }
  if (raw.type === "open_demo") {
    const demo = allowed.demos.find((item) => item.slug === raw.target);
    return demo && { kind: "demo", label: `Try ${demo.title}`, href: demo.url };
  }
  if (raw.type === "draft_email") {
    // The recipient is always Aryan; anything the model put in `target` is ignored.
    const subject = encodeURIComponent(cleanText(raw.subject, EMAIL_SUBJECT_MAX_CHARS));
    const body = encodeURIComponent(cleanText(raw.body, EMAIL_BODY_MAX_CHARS));
    return { kind: "email", label: "Email Aryan", href: `mailto:${allowed.contactEmail}?subject=${subject}&body=${body}` };
  }
  return undefined;
}

export function checkAnswer(raw: unknown, allowed: AllowedTargets): { ok: true; reply: AskReply } | { ok: false } {
  if (!isRecord(raw)) return { ok: false };
  const answer = cleanText(raw.answer, ANSWER_MAX_CHARS);
  if (answer.length === 0) return { ok: false };

  const sourceIds = Array.isArray(raw.sources) ? [...new Set(raw.sources)] : [];
  const sources = sourceIds
    .map((id) => allowed.sections.find((section) => section.id === id))
    .filter((section): section is AskSection => section !== undefined)
    .slice(0, MAX_SOURCES)
    .map(({ id, title, url }) => ({ id, title, url }));

  const actions: AskAction[] = [];
  for (const item of Array.isArray(raw.actions) ? raw.actions : []) {
    const action = toAction(item, allowed);
    // One of each kind and target is enough; repeats are dropped.
    if (action && !actions.some((existing) => existing.href === action.href || (existing.kind === "email" && action.kind === "email"))) {
      actions.push(action);
    }
  }

  return { ok: true, reply: { answer, sources, actions: actions.slice(0, MAX_ACTIONS) } };
}
