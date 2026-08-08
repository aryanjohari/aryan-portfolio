# Portfolio Guide

Server-side Gemini proxy that answers questions about Aryan Johari's portfolio using build-time aggregated context. Multi-turn within a browser session; page-aware; not a general chatbot.

## Context sources

| Source | Role |
|--------|------|
| [`content/guide-context.md`](../content/guide-context.md) | Identity, philosophy, availability (user-editable) |
| [`public/resume.pdf`](../public/resume.pdf) | Work experience, education, skills (parsed at build time into plain text + structured fields) |
| [`content/experience.md`](../content/experience.md) | Optional structured experience overrides (JSON block in markdown) |
| [`src/lib/fetched-projects.json`](../src/lib/fetched-projects.json) | Project titles, summaries, descriptions, stacks (build-time fetch) |
| [`src/data/registry.ts`](../src/data/registry.ts) | Which projects have live demos (`demo: true` in guide context) |
| [`src/lib/guide-page-meta.ts`](../src/lib/guide-page-meta.ts) | Hand-authored route blurbs for page verbs / page slice |

At build time, `npm run build:guide-context` writes [`src/lib/guide-context.json`](../src/lib/guide-context.json), including **`tenureHints`** (approximate professional tenure from role periods). Resume PDF text is extracted once and cached — the API never reads or sends the PDF per request.

## Build-time token budget

Constants in [`scripts/build-guide-context.ts`](../scripts/build-guide-context.ts):

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_RESUME_TEXT_CHARS` | 6000 | Cap cached resume plain text |
| `MAX_PROJECT_DESCRIPTION_CHARS` | 400 | Truncate long project descriptions |
| `MAX_TOTAL_CONTEXT_CHARS` | 24000 | Warn if serialized context exceeds budget |

`meta.contextCharCount` in `guide-context.json` records the serialized size estimate. The API assembles a **route-sliced** context (identity gist, tenureHints, page/project slice; resume excerpt only when the question looks history/tenure-related) and still guards the 24k budget.

### tenureHints

Computed from structured `experience[].period` strings (`Mon YYYY – Present|Mon YYYY`):

- Per-role approximate months
- Total professional `approxYears` + suggested `wording` (“about / roughly”)
- Optional `byArea` when role titles/highlights clearly map (e.g. SEO / web growth)
- `caveats` for Present→build-date and approximation rules

Inference in the model must stay grounded in these fields — never invent years.

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
{
  "message": "How many years of experience do you have?",
  "pathname": "/about",
  "history": [
    { "role": "user", "text": "…" },
    { "role": "model", "text": "…" }
  ],
  "visitMemory": "optional rolling summary ≤1000 chars"
}
```

| Field | Rules |
|-------|--------|
| `message` | Required, ≤500 chars |
| `pathname` | Optional, ≤200 chars — current browser path |
| `history` | Optional, last ≤3 user/model pairs; per-turn and total char caps |
| `visitMemory` | Optional, ≤1000 chars |

**Success:**

```json
{
  "reply": "…",
  "visitMemory": "optional refreshed summary",
  "navigateTo": "/projects/background-studio",
  "source": "model"
}
```

`navigateTo` is optional and only present when recommending a single confirmable destination. Server allowlists `/`, `/about`, `/projects`, `/projects/{slug}` for known project slugs, and `/resume.pdf`. Invalid values are stripped — never returned.

`source` is `"page-meta"` when a known page verb / go-intent short-circuits to a static route blurb (no Gemini call), or `"model"` for free-form answers.

**Errors:** `{ "error": "…" }` with status 400 (validation), 429 (rate limit), 502 (Gemini failure), or 503 (missing API key).

**Limits:**

- Max message length: 500 characters
- History: 3 pairs / ~3k chars
- Rate limit: 20 requests per 10 minutes per IP (in-memory; resets on cold start in serverless — not a hard guarantee across instances)
- Client session: 10 user asks per browser session (`sessionStorage`); then soft stop

**Hybrid page verbs (static, no Gemini):** Exact-ish matches such as “explain this page”, “what am I looking at?”, “summarize”, “what should I look at?”, “why does this matter?”, and go-intents like “where should I go next from here?” return the hand-authored blurb / next-path suggestion for the current route or project when page meta exists. Go-intents include a validated `navigateTo` when a next path is known.

**System prompt (voice):**

- Quiet gallery curator × friendly peer engineer — warm, plain, concise
- Grounded answers only; no invented employers/dates/metrics/projects
- Dated inference allowed from `tenureHints` with approximate wording
- Page-aware from `pathname` + page/project slice
- Off-topic → playful redirect to the portfolio
- Model responses prefer JSON `{ reply, visitMemory, navigateTo? }` in one call (plain reply fallback supported); `navigateTo` only for explicit go/next-page asks

## Client UX

[`PortfolioGuide`](../src/components/PortfolioGuide.tsx) (`home` | `mini`):

- **Live stage** shows only the latest guide answer (loading / error in the same pane) — not a chat stack
- Three whisper hints: **ask** (focus input), **explain page**, **go to…** (asks for one best next path)
- When `navigateTo` is returned, show confirm chip (`go to {path}?` · **Go** / **Stay**) — never navigate without **Go**
- Full multi-turn transcript lives in a quiet **Chat history** overlay (glyph control; hidden until turns exist); memory still persists for the API
- Persists to `sessionStorage` key `portfolio-guide:v1` for the browser session
- Sends `pathname`, last 2–3 turns, and `visitMemory`
- **clear history** (inside the history panel) wipes storage + UI; closing history does not
- Invite: `ask about this page or my work` — whisper hints, not a SaaS chip rail
- Ask pill stays Y-stable while replies stream (absolute reply band + internal scroll)
## Testing checklist

1. `npm run build:guide-context` — verify `resumeText`, `experience`, `tenureHints`, and `meta.contextCharCount`
2. `npm run build` — full prebuild chain
3. Set `GEMINI_API_KEY` in `.env.local`
4. `npm run dev` → open `/`
5. Verify accurate answers for:
   - **Years of experience / by area** → approximate wording matching `tenureHints`
   - **Follow-up** after an experience answer → uses history or visitMemory
   - **Explain / summarize this page** on `/`, `/about`, `/projects`, `/projects/[slug]` → grounded; `source: page-meta` for verb matches
   - **Free-form on a project page** → prefers that project’s slice
   - **Work experience employers** → Specialist Support Services; KRIL Digital
   - **Live demos** → background-studio, sound-visualiser
   - **Auckland availability** → September 2026
   - **Out of scope** (e.g. weather) → polite redirect
   - **Invented employer** → no fabrication
6. Navigate site↔site — transcript reappears after remount; **clear history** empties it
7. 11th ask in one session → client soft-stop message
8. `/workshop` gallery and `/projects/[slug]` demos unchanged

**curl smoke tests:**

```bash
curl -X POST http://localhost:3000/api/guide \
  -H "Content-Type: application/json" \
  -d '{"message":"How many years of experience do you have and in what?"}'

curl -X POST http://localhost:3000/api/guide \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain this page","pathname":"/about"}'
```

## Limitations

- Session transcript is browser `sessionStorage` only — not accounts, not multi-device, not cross-day
- Rate limiting is best-effort in serverless (per-instance memory)
- Guide cannot access live GitHub or unwired demo sandboxes
- Structured resume parsing is heuristic; if it fails, answers still work from `resumeText` when included
- Answers quality depends on `guide-context.md`, resume PDF, fetched YAML, and page-meta blurbs
- No SaaS chip rails, tool calling, RAG, or server-side transcript store
- Navigation suggestions require client confirm — never auto-teleport from model text alone

## Updating guide knowledge

1. Edit `content/guide-context.md` for bio, availability, philosophy
2. Replace `public/resume.pdf` when employment or education changes (rebuild refreshes `tenureHints`)
3. Optionally add `content/experience.md` with a JSON code block to override structured experience
4. Edit route blurbs in `src/lib/guide-page-meta.ts`
5. Update project repos' `portfolio.yaml` and redeploy (or run `npm run fetch:projects`)
6. Rebuild — `guide-context.json` regenerates automatically in prebuild (`npm run build:guide-context`)
