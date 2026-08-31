# Ship checklist

Pre-deploy verification for the portfolio site.

## Build & lint

1. `npm run fetch:projects` — optional if project `portfolio.yaml` files are unchanged
2. `npm run build:guide-context` — required after resume or knowledge-bank updates
3. `npm run lint`
4. `npm run build`

## Smoke tests

| Route | Desktop | Mobile |
|-------|---------|--------|
| `/` | chips, tags, ask | same |
| `/projects` | one viewport | drag + no page scroll |
| `/projects/background-studio` | hero + case + stage | title + CTAs |
| `/projects/ada` | exhibit | same |
| `/about` | essay scroll | same |
| `/about` mini guide | reply + history | panel clip OK |

- Home chips: ask chips return grounded answers; navigate chips go to `/projects` and `/about`
- Guide: no raw `{ "reply": ... }` JSON in live whisper or history
- `GEMINI_API_KEY` set on Vercel

## Optional API check

```bash
curl -s -X POST http://localhost:3000/api/guide \
  -H "Content-Type: application/json" \
  -d '{"message":"Who is Aryan?"}' | head -c 500
```

## Explicitly deferred (v2)

- ADA blogs
- GitHub webhooks
- Branch previews
- About essay rewrite
