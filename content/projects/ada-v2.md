---
title: ADA v2
summary: "A rebuild of ADA where every action goes through one checkpoint that checks it and keeps a receipt."
why: "I wanted an assistant that feels native to the machine and that I can actually trust. The tools are fixed, tested code that always do the same thing. The model will only route requests and do the thinking; it never runs the tools' work itself."
thread: ai
tier: in-progress
order: 1
status: { state: wip, as_of: 2026-11-14, note: "Watching the Pi; no model calls yet" }
role: Solo
dates: Oct 2026 – present
stack: [Python, FastAPI, SQLite, Rust, Raspberry Pi]
proves: Where I'm heading, governed AI systems
proof: ["TODO: test count (run the suite)", "11 decision records", "CI"]
visibility: { code: private, cannot_show: "Private for now, public later" }
---

## The problem

TODO: the problem, in your words (the draft has no problem section; the "why" line covers part of it).

## What I built

- **Watches the Pi:** health, load, power, boot, logs, devices on the network, open ports, failed services. It samples these on a schedule and keeps an hourly summary.
- **Raises alerts** from simple rules over what it saw (new device, a watched file changed, failed logins), log-only for now.
- **Shows it all** on a small status page, reachable only from my own devices over Tailscale.
- **Never holds root.** The one thing that needs root (reading the Pi's power data) is done by a tiny separate program in Rust that does exactly one fixed job and checks who's asking before it reads a byte.

There's no AI model in it yet. That's on purpose: the checkpoint, the receipts and the limits come first; the model comes once there's something safe for it to sit inside.

## The key decision

**One checkpoint for everything.** Every tool, wherever it lives, is registered in one place, and every call goes through one gateway: check the input, check the policy, check the budget, write a receipt. Write actions are dry-run only until an approval step exists.

**Code first, model at the edges.** Fixed jobs (collect, store, compare) are plain code. The model will only be used for judgement calls, like explaining an alert, inside a loop with a step limit, a budget and an approval gate.

**Decisions written down first.** 11 decision records so far (stack, threat model, receipts, identity, approvals and the broker, alerts), each written before or with the code.

**The biggest difference from ADA: tools and use first.** ADA started from the model and kept adding things for it to do. v2 starts from the tools: each one is a small, deterministic job on the real machine, built because I need it, and the model is added last, only where judgement helps.

## What I learned

TODO: what you've learned so far, in your words (the draft has no section for this yet).

## What it can't do

- Work in progress: no model calls yet, no approvals, write actions are dry-run.
- "Contained and audited", not "secure"; its threat model says so.
- The identity check proves which device called, not which person.
- Runs on one Pi; only I use it.

## What's next

1. **Test it properly:** an evaluation set with a baseline, prompt-injection tests, backups and a watchdog.
2. **Add the model, in tiers:** rules first, then a cloud model for routing and explaining, then a local model only if it earns its place.
3. **Harden it at the OS level:** approvals for write actions, sandboxes, an OS-level audit trail.

It already keeps an eye on [PII Gateway](/projects/pii-gateway), which runs on the same Pi. I'll connect the two properly once the model is in and there's data that needs scrubbing.
