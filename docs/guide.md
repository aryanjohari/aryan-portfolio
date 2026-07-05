# Portfolio Guide

Server-side Gemini proxy that answers questions about Aryan Johari's portfolio using build-time aggregated context.

## Context sources

| Source | Role |
|--------|------|
| [`content/guide-context.md`](../content/guide-context.md) | Identity, philosophy, availability (user-editable) |
| [`public/resume.pdf`](../public/resume.pdf) | Work experience, education, skills (parsed at build time into plain text + structured fields) |
| [`content/experience.md`](../content/experience.md) | Optional structured experience overrides (JSON block in markdown) |
| [`src/lib/fetched-projects.json`](../src/lib/fetched-projects.json) | Project titles, summaries, descriptions, stacks (build-time fetch) |
| [`src/data/registry.ts`](../src/data/registry.ts) | Which projects have live demos (`demo: true` in guide context) |

At build time, `npm run build:guide-context` writes [`src/lib/guide-context.json`](../src/lib/guide-context.json). Resume PDF text is extracted once and cached — the API never reads or sends the PDF per request.

## Build-time token budget

Constants in [`scripts/build-guide-context.ts`](../scripts/build-guide-context.ts):

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_RESUME_TEXT_CHARS` | 6000 | Cap cached resume plain text |
| `MAX_PROJECT_DESCRIPTION_CHARS` | 400 | Truncate long project descriptions |
| `MAX_TOTAL_CONTEXT_CHARS` | 24000 | Warn if serialized context exceeds budget |

`meta.contextCharCount` in `guide-context.json` records the serialized size estimate. The API applies a matching runtime guard and drops project descriptions if needed.

## Environment setup

```bash
# .env.local
GEMINI_API_KEY=your_key_here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

**Vercel:** Add `GEMINI_API_KEY` in project settings (Production + Preview). The key is server-only — never exposed to the client.

`GITHUB_TOKEN` and `PORTFOLIO_FETCH_SKIP` behave as before. When fetch is skipped, guide context still builds from `guide-context.md`, `resume.pdf`, and committed `fetched-projects.json`.

## API behavior

**Endpoint:** `POST /api/guide`

**Request body:**

```json
{ "message": "What projects have live demos?" }
```

**Success:** `{ "reply": "..." }`

**Errors:** `{ "error": "..." }` with status 400 (validation), 429 (rate limit), 502 (Gemini failure), or 503 (missing API key).

**Limits:**

- Max message length: 500 characters
- Rate limit: 20 requests per 10 minutes per IP (in-memory; resets on cold start in serverless — not a hard guarantee across instances)

**System prompt rules:**

- Answer from provided context: identity, resume excerpt, experience, education, skills, projects
- Do not invent employers, dates, metrics, or projects
- Do not refuse prematurely when resume text has partial answers
- Decline with "I don't have specific information about that in Aryan's portfolio materials" only when the topic is absent from all sections
- Out-of-scope general knowledge (e.g. weather): polite redirect, not a portfolio-materials decline
- Concise, plain language (2–5 sentences unless user asks for detail)

## Testing checklist

1. `npm run build:guide-context` — verify `resumeText`, `experience`, and `meta.contextCharCount` in output
2. `npm run build` — full prebuild chain
3. Set `GEMINI_API_KEY` in `.env.local`
4. `npm run dev` → open `/`
5. Verify accurate answers for:
   - **Work experience** → SEO Specialist at Specialist Support Services; Junior Website Developer at KRIL Digital
   - **SEO role** → GSC metrics, organic impressions from resume
   - **Live demos** → background-studio, sound-visualiser
   - **GSTF** → deepfake / video forensics project
   - **Auckland availability** → September 2026
   - **Tech stack** → aggregated from project stacks + resume skills
   - **Out of scope** (e.g. "What's the weather?") → polite redirect, not false "no information"
6. `/workshop` shows the full project table
7. `/projects/background-studio` iframe demo unchanged

**curl smoke test:**

```bash
curl -X POST http://localhost:3000/api/guide \
  -H "Content-Type: application/json" \
  -d '{"message":"What is your work experience?"}'
```

## Limitations

- Single-turn only (no chat history in v1)
- Rate limiting is best-effort in serverless (per-instance memory)
- Guide cannot access live GitHub or unwired demo sandboxes
- Structured resume parsing is heuristic; if it fails, answers still work from `resumeText`
- Answers quality depends on `guide-context.md`, resume PDF, and fetched YAML content

## Updating guide knowledge

1. Edit `content/guide-context.md` for bio, availability, philosophy
2. Replace `public/resume.pdf` when employment or education changes
3. Optionally add `content/experience.md` with a JSON code block to override structured experience
4. Update project repos' `portfolio.yaml` and redeploy (or run `npm run fetch:projects`)
5. Rebuild — `guide-context.json` regenerates automatically in prebuild (`npm run build:guide-context`)
