---
title: "What does this file answer about ada body birth?"
question: "What does this file answer about ada body birth?"
description: "What does this file answer about ada body birth?"
published: "2026-09-30"
modified: "2026-09-30"
fill: "build-log"
source: "docs/modules/M16_OPERATOR_NOTE.md"
canonical: "/blog/what-does-this-file-answer-about-ada-body-birth"
---

# What does this file answer about ada body birth?

**Shipped:** birth pack, syllabus heads, `due_at` / dues, `artifact_write`, Today strip, ntfy path, artifact shelf, brief check JSON.

## The problem

The gathered packet is what this page accounts for.

## How it works

This page is an account of the gathered packet. Its table repeats 40 spans from that packet.

## Spans
| # M16 Phase 0+1 operator note — first daily package |
| --- |
| **Shipped:** birth pack, syllabus heads, `due_at` / dues, `artifact_write`, Today strip, ntfy path, artifact shelf, brief check JSON. |
| ## One-time setup |
| 1. **Birth / seeds** (idempotent; never overwrites your edits): |
| ```bash |
| ada body birth |
| # or just: ada body birth-pack |
| ``` |
| Expect `ada-data/syllabus/SELF.md` + `OPERATOR.md`. |
| 2. **ntfy secret** (never commit): |
| ```bash |
| install -d -m 700 /mnt/ada-data/secrets |
| cat >/mnt/ada-data/secrets/ntfy.env <<'EOF' |
| NTFY_URL=https://ntfy.sh |
| NTFY_TOPIC=your-private-topic |
| # optional: NTFY_TOKEN=tk_… |
| EOF |
| chmod 600 /mnt/ada-data/secrets/ntfy.env |
| ``` |
| Enable push in Agent chat: *“enable notify”* → Confirm card (first enable only). |
| Or Confirm `prefs.notify_enabled=true`. Quiet hours + `mute_proactivity` still win. Budget default: **5/day**, **60m** cooldown. |
| 3. **Morning brief timer** (optional ritual): |
| ```bash |
| sudo cp deploy/systemd/ada-brief.{service,timer} /etc/systemd/system/ |
| sudo systemctl daemon-reload |
| sudo systemctl enable --now ada-brief.timer |
| ``` |
| Check payload: `ada campaigns check --json` (dues + campaigns). |
| Optional ping: `ada campaigns check --json --notify`. |
| ## Try for a week |
| ## Still deferred (Phase 2) |
| Inbox capture, Google Calendar OAuth, HA, voice wake, campaign productization, PDF, Mem0. |
| Tier A close gate (kernel verify, not ops arming): `ada tier-a check` — see `docs/modules/M18_CLOSE_TIER_A.md`. |
