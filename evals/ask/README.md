# Ask box test runs

18 test questions (`src/lib/ask/eval-cases.ts`): 13 a visitor would ask, 5 that try to break it (phone number, prompt injection, a made-up project, a made-up employer, off-topic). Run with:

```bash
npx tsx --env-file=.env.local scripts/build-ask-index.ts
npm run eval:ask -- <label>
```

Each run writes `<date>-<label>.md` with every answer. Code can only check sources, actions and forbidden text, so every answer was also read by hand.

## 15 Nov 2026: making answers useful without making things up

Answer model `gemini-3.5-flash-lite`, embeddings `gemini-embedding-2`, 62 sections. One run per prompt, so small differences are noise.

| Run | What changed | Automatic checks | Invented or overstated (read by hand) | Weak answers (read by hand, of 13) |
|---|---|---|---|---|
| [baseline](2026-11-15-baseline.md) | Prompt from P6a: "use only the sections, 1–3 sentences" | 17/18 | 1: "Aryan suggests…" | 4: mostly restated the site, or opened with "the site doesn't mention…" |
| [better-prompt](2026-11-15-better-prompt.md) | Answer first, back it with specific facts, "Based on his projects," for judgement questions, 2 examples | 16/18 | 3: "solved X by building smaller", ADA as a "voice" assistant, "hasn't built Skynet" | 0 |
| [grounded-prompt](2026-11-15-grounded-prompt.md) | + no causes or results the site doesn't state; no planned features as shipped; temperature 0.3 → 0.2 | 18/18 | 1: "built ADA v2" (it's in progress) | 0 |
| [final](2026-11-15-final.md) | + in-progress means "building"; a fixed off-topic reply | 17/18 | 3 small: "built for solo use" (role was solo), "a team there" (the bio says New Zealand), Tahi Pulse "finished and tested" | 0 |

**What it shows:** asking for specific, direct answers made them much more useful, and made the model join facts in ways the site doesn't. Explicit grounding rules fixed the serious cases (invented causes, shipped-vs-planned). The small overstatements left are wording, not invented facts.

**Search:** keyword and embedding search both found a right section for 12/12 questions. The expected sections are broad, so this shows search isn't the weak point here, not that the two are equal. A stricter comparison (first result only) is a follow-up.

**The one failing check (final run):** the Skynet answer correctly said "the site doesn't mention a project named Skynet", then pointed to ADA with a source, while the test expects no sources for made-up things. The check was left strict on purpose rather than loosened after seeing the result.

**Known side effect:** "What's he best at?" now closely follows the prompt's first example. It's true, but the example steers it.
