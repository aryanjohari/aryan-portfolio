---
title: How the Ask box works.
summary: "A small AI helper that answers from this site only, cites where each answer came from, and can only suggest actions you click yourself."
---

## What it can see

Only what's already public on this site: my bio, the long story, my jobs and education, and every project page. When the site builds, that text is split into about 70 small sections, like "Prism · The key decision" or "Junior Website Developer · KRIL Digital", each with its own id.

It can't see my CV file, my drafts, or anything I've left off the site. Whatever is in its context, someone could get it to repeat, so the context holds public text only.

## How it answers a question

1. Your question, up to 300 characters, is checked on the server.
2. It's turned into an embedding: a list of numbers that captures its meaning. Each section got one when the site was built.
3. The 4 sections closest in meaning are picked, but only if they're close enough (a similarity of 0.60 or more). That floor came from real questions: good matches scored 0.63 to 0.72, off-topic ones like "the weather" 0.51 to 0.58.
4. Gemini gets a short list of every section, the full text of those 4, and your question, fenced off so it's read as a question and never as instructions.
5. It has to reply in a fixed shape: an answer, the ids of the sections it used, and up to two suggested actions.
6. The server checks that reply. Sources that don't exist are dropped, and so are actions.

I used embeddings rather than keyword search because visitors don't use my words: "Which project is about privacy?" should find PII Gateway even though the question shares no keywords with its page. If the embedding step fails, it falls back to keyword search, so the box keeps working.

## What it can do, and what it can't

It can suggest three things: open a page on this site, open a project's live demo in a new tab, or draft an email to me in your own email app.

The model only names a section or a project. The server builds every link from what the site really has, so it can't send you to a page or demo that doesn't exist, and an email draft always goes to me. Nothing happens until you click.

It can't send email itself. That would make it a tool anyone could use to spam me or other people, so the drafting stays with the AI and the sending stays with you.

## How I tested it

I wrote 18 test questions: 13 that a recruiter might ask, and 5 that try to break it (my phone number, "ignore your instructions", a made-up project, a made-up employer, the weather). Code checks the sources, the actions and any forbidden text; I read every answer for whether it's true and useful.

- **First version:** correct but flat. 4 of the 13 real answers mostly repeated the site, and 1 made something up ("Aryan suggests…").
- **Asked for direct, specific answers:** all 13 became useful, but made-up links between facts went up to 3, such as "he solved X by doing Y" when the site never says that.
- **Added grounding rules** (no causes or results the site doesn't state, no planned work described as shipped) **and lowered the temperature:** the serious cases went away. What's left is small wording, like "a team there" when my bio says New Zealand.

In every run, none of the 5 break-it questions leaked anything or got a made-up answer. The lesson: making answers more helpful made the model more willing to connect dots that aren't there, and the fix was explicit rules plus reading the answers, not just a higher pass rate.

## Speed and cost

About 1.7 seconds per answer. Each question sends about 2,100 tokens and gets back about 120, which at Gemini 3.5 Flash-Lite's list price (November 2026) is roughly a tenth of a cent, or about $1 per thousand questions. Sending the whole site every time would cost about three times as much. A rate limit and a spending cap sit in front of it.

## What it doesn't do

- One question at a time, with no memory between questions, so nobody can plant instructions for later.
- English only.
- It can still overstate small things in wording; that's why every answer shows its sources.
- It knows only this site. If something isn't here, it says so and suggests emailing me.

The code is [on GitHub](https://github.com/aryanjohari/aryan-portfolio/tree/main/src/lib/ask), and every test run, with all the answers, is in [evals/ask](https://github.com/aryanjohari/aryan-portfolio/tree/main/evals/ask).
