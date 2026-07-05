import guideContext from "@/lib/guide-context.json";
import type { GuideContextFile } from "@/lib/guide-schema";

const MAX_MESSAGE_LENGTH = 500;
const MAX_RUNTIME_CONTEXT_CHARS = 24000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const GEMINI_MODEL = "gemini-2.5-flash";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type CompactGuideContext = {
  identity: string;
  availability?: string;
  experience: GuideContextFile["experience"];
  education: GuideContextFile["education"];
  skills?: string[];
  resumeExcerpt: string;
  projects: Array<{
    slug: string;
    title: string;
    summary: string;
    description?: string;
    stack: string[];
    demo?: boolean;
  }>;
  meta: GuideContextFile["meta"];
};

const rateLimitStore = new Map<string, RateLimitEntry>();
let runtimeContextTrimLogged = false;

const context = guideContext as GuideContextFile;

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

function buildCompactContext(ctx: GuideContextFile): CompactGuideContext {
  const compact: CompactGuideContext = {
    identity: ctx.identity,
    availability: extractAvailability(ctx),
    experience: ctx.experience,
    education: ctx.education,
    ...(ctx.skills && ctx.skills.length > 0 ? { skills: ctx.skills } : {}),
    resumeExcerpt: ctx.resumeText,
    projects: ctx.projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      description: project.description,
      stack: project.stack,
      ...(project.demo ? { demo: true } : {}),
    })),
    meta: ctx.meta,
  };

  let serialized = JSON.stringify(compact);
  if (serialized.length <= MAX_RUNTIME_CONTEXT_CHARS) {
    return compact;
  }

  const trimmed: CompactGuideContext = {
    ...compact,
    projects: compact.projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      stack: project.stack,
      ...(project.demo ? { demo: true } : {}),
    })),
  };

  serialized = JSON.stringify(trimmed);
  if (
    process.env.NODE_ENV === "development" &&
    !runtimeContextTrimLogged &&
    serialized.length < JSON.stringify(compact).length
  ) {
    console.warn(
      `Guide context trimmed at runtime (${JSON.stringify(compact).length} → ${serialized.length} chars).`,
    );
    runtimeContextTrimLogged = true;
  }

  return trimmed;
}

const compactContext = buildCompactContext(context);

function buildSystemPrompt(): string {
  const contextBlock = JSON.stringify(compactContext, null, 2);

  return `You are the portfolio guide for Aryan Johari's workshop site. Answer using ONLY the context below.

Rules:
1. Use identity, availability, resumeExcerpt, experience, education, skills, and projects as your sources.
2. Do not invent employers, dates, metrics, projects, or credentials that are not in the context.
3. Do not refuse prematurely. If partial information exists (for example, resumeExcerpt mentions a role but experience is empty), answer from resumeExcerpt.
4. Say "I don't have specific information about that in Aryan's portfolio materials" ONLY when the topic is absent from all context sections.
5. For general knowledge or unrelated questions (for example, weather), politely say you can only help with Aryan's portfolio, background, and projects.
6. For project questions, mention live demos when demo is true.
7. For hiring or availability questions, use availability, education, and resumeExcerpt.
8. Be concise: 2-5 sentences unless the user asks for more detail.

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

async function callGemini(message: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt() }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
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

  return text;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      { error: "Guide is not configured. GEMINI_API_KEY is missing." },
      { status: 503 },
    );
  }

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

  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
      ? (body as { message: string }).message.trim()
      : "";

  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return Response.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    const reply = await callGemini(message, apiKey);
    return Response.json({ reply });
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Guide request failed.";
    return Response.json({ error: messageText }, { status: 502 });
  }
}
