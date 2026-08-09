import guideContext from "@/lib/guide-context.json";
import { validateNavigateTo } from "@/lib/guide-navigate";
import {
  buildProjectPageMeta,
  extractProjectSlug,
  getStaticPageMeta,
  normalizeGuidePathname,
  type GuidePageMeta,
} from "@/lib/guide-page-meta";
import type { GuideContextFile, TenureHints } from "@/lib/guide-schema";

const MAX_MESSAGE_LENGTH = 500;
const MAX_PATHNAME_LENGTH = 200;
const MAX_HISTORY_PAIRS = 3;
const MAX_HISTORY_USER_CHARS = 500;
const MAX_HISTORY_MODEL_CHARS = 800;
const MAX_HISTORY_TOTAL_CHARS = 3000;
const MAX_VISIT_MEMORY_CHARS = 1000;
const MAX_RUNTIME_CONTEXT_CHARS = 24000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const GEMINI_MODEL = "gemini-2.5-flash-lite";
/** Safe visitor-facing text when the model payload cannot be cleaned. */
const PARSE_FALLBACK_REPLY =
  "I couldn't shape that answer cleanly — try asking again in a different way.";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type GuideTurn = {
  role: "user" | "model";
  text: string;
};

type GuideRequestBody = {
  message: string;
  pathname?: string;
  history?: GuideTurn[];
  visitMemory?: string;
};

type SlicedGuideContext = {
  identity: string;
  availability?: string;
  tenureHints?: TenureHints;
  experience: GuideContextFile["experience"];
  education: GuideContextFile["education"];
  skills?: string[];
  resumeExcerpt?: string;
  page?: GuidePageMeta;
  projects?: Array<{
    slug: string;
    title: string;
    summary: string;
    description?: string;
    stack: string[];
    demo?: boolean;
  }>;
  projectIndex?: Array<{ slug: string; title: string; demo?: boolean }>;
  meta: GuideContextFile["meta"];
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const context = guideContext as GuideContextFile;

const PAGE_VERB_PATTERNS = [
  /^explain\s+this\s+page\??$/i,
  /^what\s+am\s+i\s+looking\s+at\??$/i,
  /^summarize(\s+this(\s+page)?)?\??$/i,
  /^summarise(\s+this(\s+page)?)?\??$/i,
  /^what\s+should\s+i\s+look\s+at\??$/i,
  /^why\s+does\s+this\s+matter\??$/i,
];

/** Soft “where next?” — returns navigateTo for confirm, never auto. */
const GO_INTENT_PATTERNS = [
  /^where\s+should\s+i\s+go(\s+next)?(\s+from\s+here)?\??$/i,
  /^go\s+somewhere\??$/i,
  /^where\s+next\??$/i,
  /^suggest\s+(a\s+|one\s+)?(page|path|place)\??$/i,
  /^what\s+should\s+i\s+look\s+at\??$/i,
];

/**
 * Explicit teleport intent — server may set autoNavigate when navigateTo is
 * allowlisted. Keep tighter than soft go-intent (must not match “where should I go”).
 */
const EXPLICIT_GO_PATTERNS = [
  /\bgo\s+to\b/i,
  /\btake\s+me\s+(to|there)\b/i,
  /\bnavigate\s+to\b/i,
  /\bbring\s+me\s+to\b/i,
  /\bopen\s+(the\s+)?(about|projects|resume|home|page)\b/i,
  /^go\s+there\.?$/i,
  /^open\s+(it|that)\.?$/i,
];

const RESUME_INTENT_PATTERN =
  /\b(experience|resume|cv|employment|employer|years?|tenure|role|job|work history|availability|eligible|visa|education|degree|unitec|mumbai|how long|months?)\b/i;

const PROJECT_SLUGS = new Set(context.projects.map((project) => project.slug));

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

function extractAvailability(ctx: GuideContextFile): string | undefined {
  const sources = [ctx.identity, ctx.resumeText].filter(Boolean).join("\n");
  const patterns = [
    /Seeking[^.\n]{0,120}Auckland[^.\n]*/i,
    /available from [A-Za-z]+ \d{4}/i,
    /Eligible to work in (?:NZ|New Zealand)[^.\n]*/i,
  ];

  for (const pattern of patterns) {
    const match = sources.match(pattern);
    if (match) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return undefined;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function resolvePageMeta(
  pathname: string | undefined,
  ctx: GuideContextFile,
): GuidePageMeta | undefined {
  if (!pathname) return undefined;
  const normalized = normalizeGuidePathname(pathname);
  const staticMeta = getStaticPageMeta(normalized);
  if (staticMeta) return staticMeta;

  const slug = extractProjectSlug(normalized);
  if (!slug) return undefined;
  const project = ctx.projects.find((entry) => entry.slug === slug);
  if (!project) return undefined;
  return buildProjectPageMeta(project);
}

function isPageVerbMessage(message: string): boolean {
  const trimmed = message.trim();
  return PAGE_VERB_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isGoIntentMessage(message: string): boolean {
  const trimmed = message.trim();
  return GO_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isExplicitGoMessage(message: string): boolean {
  const trimmed = message.trim();
  return EXPLICIT_GO_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Auto only when visitor clearly asked to go and destination is allowlisted. */
function withAutoNavigate(
  payload: { reply: string; visitMemory?: string; navigateTo?: string },
  message: string,
): { reply: string; visitMemory?: string; navigateTo?: string; autoNavigate?: boolean } {
  if (payload.navigateTo && isExplicitGoMessage(message)) {
    return { ...payload, autoNavigate: true };
  }
  return payload;
}

function buildStaticPageReply(
  page: GuidePageMeta,
  message: string,
): { reply: string; navigateTo?: string } {
  const lower = message.trim().toLowerCase();
  const next = page.nextPath
    ? validateNavigateTo(page.nextPath, PROJECT_SLUGS)
    : undefined;

  if (isGoIntentMessage(message)) {
    const destination = next ?? "/projects";
    return {
      reply: `From here, try ${destination} next — one concrete path deeper into the portfolio.`,
      navigateTo: destination,
    };
  }
  if (/why does this matter/.test(lower)) {
    return {
      reply: `${page.blurb}\n\nHiring signal: it’s a focused look at craft and delivery, not a dump of everything Aryan has ever touched.${next ? ` Next: ${next}.` : ""}`,
    };
  }
  return {
    reply: next ? `${page.blurb}\n\nNext path: ${next}.` : page.blurb,
  };
}

function needsResumeExcerpt(message: string, history: GuideTurn[]): boolean {
  if (RESUME_INTENT_PATTERN.test(message)) return true;
  return history.some((turn) => RESUME_INTENT_PATTERN.test(turn.text));
}

function buildSlicedContext(
  ctx: GuideContextFile,
  pathname: string | undefined,
  message: string,
  history: GuideTurn[],
): SlicedGuideContext {
  const page = resolvePageMeta(pathname, ctx);
  const slug = pathname ? extractProjectSlug(pathname) : undefined;
  const focusedProject = slug
    ? ctx.projects.find((project) => project.slug === slug)
    : undefined;

  const includeResume = needsResumeExcerpt(message, history);

  const sliced: SlicedGuideContext = {
    identity: truncate(ctx.identity, 1800),
    availability: extractAvailability(ctx),
    ...(ctx.tenureHints ? { tenureHints: ctx.tenureHints } : {}),
    experience: ctx.experience,
    education: ctx.education,
    ...(ctx.skills && ctx.skills.length > 0 ? { skills: ctx.skills } : {}),
    ...(includeResume
      ? { resumeExcerpt: truncate(ctx.resumeText, 4000) }
      : {}),
    ...(page ? { page } : {}),
    projectIndex: ctx.projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      ...(project.demo ? { demo: true } : {}),
    })),
    meta: ctx.meta,
  };

  if (focusedProject) {
    sliced.projects = [
      {
        slug: focusedProject.slug,
        title: focusedProject.title,
        summary: focusedProject.summary,
        description: focusedProject.description,
        stack: focusedProject.stack,
        ...(focusedProject.demo ? { demo: true } : {}),
      },
    ];
  } else if (!page || page.pathname === "/projects" || page.pathname === "/workshop") {
    sliced.projects = ctx.projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      stack: project.stack,
      ...(project.demo ? { demo: true } : {}),
    }));
  }

  let serialized = JSON.stringify(sliced);
  if (serialized.length <= MAX_RUNTIME_CONTEXT_CHARS) {
    return sliced;
  }

  if (sliced.projects) {
    sliced.projects = sliced.projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      stack: project.stack,
      ...(project.demo ? { demo: true } : {}),
    }));
  }
  if (sliced.resumeExcerpt) {
    sliced.resumeExcerpt = truncate(sliced.resumeExcerpt, 2000);
  }

  serialized = JSON.stringify(sliced);
  if (serialized.length > MAX_RUNTIME_CONTEXT_CHARS && sliced.resumeExcerpt) {
    delete sliced.resumeExcerpt;
  }

  return sliced;
}

function buildSystemPrompt(
  sliced: SlicedGuideContext,
  pathname: string | undefined,
  visitMemory: string | undefined,
): string {
  const contextBlock = JSON.stringify(sliced, null, 2);
  const pathLine = pathname
    ? `The visitor is currently on pathname: ${pathname}.`
    : "No current pathname was provided.";
  const memoryLine = visitMemory
    ? `Visit memory (earlier conversation summary):\n${visitMemory}`
    : "No prior visit memory.";

  return `You are a quiet gallery curator and a friendly peer engineer for Aryan Johari’s portfolio. Warm, plain, concise — not salesy, corporate, or sarcastic. Prefer short semantic takes over resume dumps.

Grounding: Use ONLY the CONTEXT JSON, visit memory, and conversation history. Never invent employers, titles, dates, metrics, credentials, or projects that are not present.

Inference: You may approximate years/durations from tenureHints and dated periods. Prefer tenureHints.professional.wording and byArea when present. Say “about / roughly” and “based on roles listed.” If dates are ambiguous, say what is known — never invent a number.

Page: ${pathLine} Explain or summarize the current page only from CONTEXT.page / CONTEXT.projects — do not invent UI chrome or on-page copy that is not in context. When useful, you may mention at most one concrete next site path in the reply text. Do not invent slugs.

Navigation: Set navigateTo to at most ONE allowlisted path when the visitor (a) asks where something lives / how to find a page or project, (b) asks where to go / what to look at next / for a page suggestion, or (c) explicitly asks to go / be taken / open a destination. Mention that path once in the reply. Allowed paths only: "/", "/about", "/projects", "/projects/{slug}" for slugs in CONTEXT.projectIndex, and "/resume.pdf". If unsure, omit navigateTo and say you don’t know that page. Never set navigateTo for ordinary Q&A or page explain/summarize that is not about locating or going somewhere. The client confirms soft suggestions; explicit go phrases may auto-navigate — still set navigateTo so the destination is clear.

Off-topic (weather, unrelated general knowledge): briefly and playfully redirect back to the portfolio.

Length: prefer 2–4 short sentences unless the visitor asks for detail or an explain/summarize of the page. Stay scannable — not a wall of text.

Response format: Return ONLY a JSON object (no markdown fences, no prose outside JSON) shaped as:
{"reply":"<answer for the visitor>","visitMemory":"<≤1000 chars rolling summary of this visit for future turns>","navigateTo":"<optional allowlisted path or omit>"}
Update visitMemory to a short curator note of topics already covered. If you cannot update memory, still return JSON with reply and an empty visitMemory string. Omit navigateTo unless locating, suggesting, or fulfilling a go request for a single destination.

${memoryLine}

CONTEXT:
${contextBlock}`;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

/** Strip a single outer ``` / ```json fence if the whole payload is fenced. */
function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch?.[1]?.trim() ?? trimmed;
}

/** First balanced `{…}` object, respecting string escapes. */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function coerceGuidePayload(parsed: {
  reply?: unknown;
  visitMemory?: unknown;
  navigateTo?: unknown;
}): { reply: string; visitMemory?: string; navigateTo?: string } | null {
  if (typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    return null;
  }
  const visitMemory =
    typeof parsed.visitMemory === "string"
      ? truncate(parsed.visitMemory.trim(), MAX_VISIT_MEMORY_CHARS)
      : undefined;
  const navigateTo = validateNavigateTo(parsed.navigateTo, PROJECT_SLUGS);
  return {
    reply: parsed.reply.trim(),
    ...(visitMemory ? { visitMemory } : {}),
    ...(navigateTo ? { navigateTo } : {}),
  };
}

/**
 * Parse model output into a visitor-safe guide payload.
 * Never returns raw JSON / fenced blobs as `reply`.
 */
function parseGuideModelPayload(raw: string): {
  reply: string;
  visitMemory?: string;
  navigateTo?: string;
} {
  const unfenced = stripJsonFences(raw);
  const candidates = [unfenced];
  const extracted = extractFirstJsonObject(unfenced);
  if (extracted && extracted !== unfenced) {
    candidates.push(extracted);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        reply?: unknown;
        visitMemory?: unknown;
        navigateTo?: unknown;
      };
      const coerced = coerceGuidePayload(parsed);
      if (coerced) return coerced;
    } catch {
      // try next candidate
    }
  }

  return { reply: PARSE_FALLBACK_REPLY };
}

/**
 * Recover a human reply if older session turns stored a leaked JSON payload.
 * Returns empty string when the text is unusable JSON with no recoverable reply.
 */
function scrubModelTurnText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const unfenced = stripJsonFences(trimmed);
  const looksJson =
    unfenced.startsWith("{") ||
    /"reply"\s*:/.test(unfenced) ||
    trimmed.startsWith("```");

  if (!looksJson) return trimmed;

  const candidates = [unfenced];
  const extracted = extractFirstJsonObject(unfenced);
  if (extracted) candidates.unshift(extracted);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { reply?: unknown };
      if (typeof parsed.reply === "string" && parsed.reply.trim()) {
        return parsed.reply.trim();
      }
    } catch {
      // continue
    }
  }

  // Prose before a trailing JSON dump — keep the prose only.
  const dumpAt = trimmed.search(/\{[\s\S]*"reply"\s*:/);
  if (dumpAt > 0) {
    const before = trimmed.slice(0, dumpAt).trim();
    if (before && !before.includes('"reply"')) return before;
  }

  return "";
}

function sanitizeHistory(raw: unknown): GuideTurn[] {
  if (!Array.isArray(raw)) return [];

  const turns: GuideTurn[] = [];
  let totalChars = 0;

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if ((role !== "user" && role !== "model") || typeof text !== "string") {
      continue;
    }
    const cleaned =
      role === "model" ? scrubModelTurnText(text) : text.trim();
    if (!cleaned) continue;
    const capped =
      role === "user"
        ? truncate(cleaned, MAX_HISTORY_USER_CHARS)
        : truncate(cleaned, MAX_HISTORY_MODEL_CHARS);
    if (!capped) continue;
    if (totalChars + capped.length > MAX_HISTORY_TOTAL_CHARS) break;
    turns.push({ role, text: capped });
    totalChars += capped.length;
  }

  // Keep last N pairs worth of messages (max 6).
  const maxMessages = MAX_HISTORY_PAIRS * 2;
  return turns.slice(-maxMessages);
}

function parseRequestBody(body: unknown):
  | { ok: true; data: GuideRequestBody }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body." };
  }

  const record = body as Record<string, unknown>;
  const message =
    typeof record.message === "string" ? record.message.trim() : "";

  if (!message) {
    return { ok: false, error: "Message is required." };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  let pathname: string | undefined;
  if (typeof record.pathname === "string" && record.pathname.trim()) {
    pathname = truncate(
      normalizeGuidePathname(record.pathname),
      MAX_PATHNAME_LENGTH,
    );
  }

  const history = sanitizeHistory(record.history);

  let visitMemory: string | undefined;
  if (typeof record.visitMemory === "string" && record.visitMemory.trim()) {
    visitMemory = truncate(record.visitMemory.trim(), MAX_VISIT_MEMORY_CHARS);
  }

  return {
    ok: true,
    data: {
      message,
      ...(pathname ? { pathname } : {}),
      ...(history.length > 0 ? { history } : {}),
      ...(visitMemory ? { visitMemory } : {}),
    },
  };
}

async function callGemini(options: {
  message: string;
  history: GuideTurn[];
  pathname?: string;
  visitMemory?: string;
  sliced: SlicedGuideContext;
  apiKey: string;
}): Promise<{ reply: string; visitMemory?: string; navigateTo?: string }> {
  const { message, history, pathname, visitMemory, sliced, apiKey } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    {
      role: "user" as const,
      parts: [{ text: message }],
    },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt(sliced, pathname, visitMemory) }],
      },
      contents,
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 640,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            reply: { type: "STRING" },
            visitMemory: { type: "STRING" },
            navigateTo: { type: "STRING" },
          },
          required: ["reply"],
        },
      },
    }),
  });

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini request failed.");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseGuideModelPayload(text);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseRequestBody(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { message, pathname, history = [], visitMemory } = parsed.data;
  const page = resolvePageMeta(pathname, context);

  if (page && (isPageVerbMessage(message) || isGoIntentMessage(message))) {
    const staticReply = withAutoNavigate(
      buildStaticPageReply(page, message),
      message,
    );
    return Response.json({
      reply: staticReply.reply,
      source: "page-meta" as const,
      ...(staticReply.navigateTo
        ? { navigateTo: staticReply.navigateTo }
        : {}),
      ...(staticReply.autoNavigate ? { autoNavigate: true } : {}),
      ...(visitMemory ? { visitMemory } : {}),
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      { error: "Guide is not configured. GEMINI_API_KEY is missing." },
      { status: 503 },
    );
  }

  const sliced = buildSlicedContext(context, pathname, message, history);

  try {
    const result = await callGemini({
      message,
      history,
      pathname,
      visitMemory,
      sliced,
      apiKey,
    });
    const guided = withAutoNavigate(result, message);
    return Response.json({
      reply: guided.reply,
      source: "model" as const,
      ...(guided.visitMemory ? { visitMemory: guided.visitMemory } : {}),
      ...(guided.navigateTo ? { navigateTo: guided.navigateTo } : {}),
      ...(guided.autoNavigate ? { autoNavigate: true } : {}),
    });
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Guide request failed.";
    return Response.json({ error: messageText }, { status: 502 });
  }
}
