---
title: PII Gateway
summary: "Removes names, emails and other personal details from data before it's stored or sent to an AI."
why: "I keep a lot of my own data on a Raspberry Pi to analyse later, and I wanted something in the middle that scrubs the personal details out first. It was also my way to learn data guardrails, privacy rules, and how to build an internal tool."
thread: ai
tier: featured
order: 2
status: { state: live, as_of: 2026-11-14, note: "Finished; the demo uses sample data only" }
role: Solo
dates: Mar 2026 – Oct 2026
stack: [Python, FastAPI, Presidio, Docker]
proves: Back-end APIs, honest about limits
proof: ["250 tests, 92% coverage", "CI: lint, type checks, tests and Docker build", "Live demo"]
links:
  demo: https://pii-gateway.arkhives.nz
  github: https://github.com/aryanjohari/pii-gateway
visibility: { code: public }
---

## The problem

I collect a lot of data on my Raspberry Pi that I want to store and analyse later. Most of that analysis doesn't need anyone's name, email or phone number, so the data shouldn't carry them. The same goes for logs, backups, and prompts sent to AI models. Every app ends up writing its own half-finished "strip the emails" code, and each copy misses different things.

I wanted one small service that sits in the middle. You send it text or JSON, it sends back the same thing with the personal details replaced by placeholders like `<PERSON>` or `<EMAIL_ADDRESS>`, and nothing downstream ever sees the originals.

## What I built

You call one endpoint with some text and/or a JSON object. For fields you've declared in a policy file, like `email` or `full_name`, the rule is exact: redact, mask, tokenise or pass through. Anything you didn't declare still gets checked by Microsoft Presidio, which uses patterns and a language model from spaCy to spot names, emails and phone numbers in free text. There's no generative AI inside the gateway; it sits around AI, so what reaches a model is already cleaned.

I added recognisers for New Zealand identifiers: NHI (health) numbers, IRD (tax) numbers, driver licences and NZ phone numbers. NHI and IRD numbers have check digits, so the gateway checks the maths and drops look-alikes that only happen to match the pattern.

It also works as a drop-in proxy for AI APIs. Point your OpenAI-style SDK at the gateway instead of the provider, and prompts are cleaned before they leave your network. Streaming works too.

For bigger jobs, it can pull from a Postgres export or a folder of CSV or JSON files on a schedule, and write the cleaned results to disk or S3.

- Fail closed: if a field can't be checked, the request is refused, not passed through.
- The AI proxy only forwards an allow-list of fields, and the upstream URL comes from config, never from the request (prevents SSRF).
- Error messages never echo the user's text back.
- Rate limit and size caps on the public demo.

On 133 synthetic NZ sentences, the NZ recognisers found every labelled number (recall 1.00). IRD and NHI made no false matches. Driver licences had 4 false matches and phone numbers 2. The gateway adds about 12 ms to a short AI request and about 54 ms to an 800-character one, measured against a stub that answers instantly. Those numbers are optimistic: I wrote both the test sentences and the recognisers, so they share my blind spots.

## The key decision

**One always-on server, not serverless.**

Early plans had it on AWS Lambda. But Presidio loads a language model when it starts, which doesn't suit a function that starts fresh on every call, and the scheduled jobs keep their progress in files on disk. It needs a real server that stays on. My Raspberry Pi already is one, for free, so the gateway ships as one Docker container that runs there or anywhere else.

What it cost: it runs as a single copy. Running several would mean each one repeats the scheduled jobs, and there's no separation between different customers. Fine for my own tool; a hosted product would need a different design.

- **Declared rules first, pattern matching second.** Fields you name are always handled exactly; Presidio only covers what you didn't declare, because it will miss things.
- **Redact only, never put the originals back.** Restoring names in an AI's reply would need a map from placeholders to real values: one more place personal data could leak.

## What I learned

Different uses need different things. Some data has to be kept, some has to be removed, and the rules for what's required change from one law and one use case to the next. What I took away is that storing personal data you don't need is never a good idea, so the useful thing is a tool that's reliable enough to scrub most of it wherever it isn't needed. PII Gateway is a basic version of that, not a guarantee.

## What it can't do

- It's best-effort redaction, not a compliance product. NLP misses are expected.
- English only.
- The evaluation data is synthetic and written by me.
- Batch SQL must be reviewed and read-only; it's not a database firewall.
- Nothing is connected to it yet.

## What's next

Finished. It runs on my Pi, and the next step is connecting my other projects and backups to it, with no changes to the gateway itself.
