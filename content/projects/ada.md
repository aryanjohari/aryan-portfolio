---
title: ADA
summary: "An AI agent on a Raspberry Pi that ran my SEO work, within limits I set."
why: "My SEO job had a lot of repeat work: checking Search Console, following news in the niche, writing pages. I wanted to turn it into a system that does that on its own, safely."
thread: ai
tier: featured
order: 3
status: { state: frozen, as_of: 2026-10-25, note: "Rebuilt as ADA v2" }
role: Solo
dates: Apr 2026 – Jul 2026
stack: [Python, Gemini, SQLite, Raspberry Pi]
proves: AI agents with safety built in
proof: ["541 passing tests", "CI", "Used on a real SEO job"]
links:
  github: https://github.com/aryanjohari/ADA
face: /projects/ada/face.svg
visibility: { code: public }
---

## The problem

As the SEO person, a lot of my week was the same loop: look at Search Console, read what's new in the niche, decide which pages to write, write them, publish. Most of that is steps, not judgement. I wanted an agent to do the steps and leave me the judgement.

## What I built

ADA runs on a Raspberry Pi at home. One install gives you three things:

- **Chat:** I talk to it, and it can use tools, plan, or just answer.
- **A background worker:** I give it goals ("keep this site's pages up to date") and it works through them on its own.
- **Publishing workflows:** it pulls in Search Console data, RSS news and brand notes, picks what to write, drafts the page, checks the facts against what it knows, and publishes it to S3.

Everything it knows lives in one SQLite database per site, with full-text search.

I used ADA on the publishing work for my part-time SEO role at Specialist Support Services, and its pages went live on the client's sites.

## The key decision

**Keep it simple: the AI does the repeated work, not whatever it likes.**

The parts were kept separate (chat, the background worker, the publishing workflows, one database per site), and the AI only did the steps I'd already defined. It couldn't just do anything. Shell commands came from an allow-list, there were daily and monthly token budgets, a kill switch, and a fact check before anything was published. To me that's what useful agentic AI looks like: a model doing repeated work inside fixed lanes, not a model with free rein.

What it cost: it can only do what I've written a workflow or allowed a command for. New kinds of work mean new code, not just a new prompt.

## What I learned

Once the SEO system worked, I tried to grow ADA into a general personal agent, to see how far I could take it: memory, "dreaming" overnight, life tracking for meals, gym, time and people, a dashboard on my phone, voice.

I learned a lot, but the code got bloated and confusing. Features depended on each other in ways I couldn't follow, and one test had never passed. So I froze it on 25 Oct 2026 and kept it as what it really was: research. I have the design cards, the research notes and the data from running it, and they're what ADA v2 is built on.

## What it can't do

- It only runs on my own hardware; it's not a hosted product.
- Its HUD is read-only and local; there's no web API.
- It needs a Gemini key for anything that thinks.

## What's next

Frozen. [ADA v2](/projects/ada-v2) is the agent done properly: one gateway that checks every action, keeps a receipt and holds the budget, designed from the research above.
