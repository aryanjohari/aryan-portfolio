export type ExhibitVariant = "api-sample" | "terminal-log" | "metrics";

export const exhibitContent: Record<ExhibitVariant, string> = {
  "api-sample": `# PII Gateway — sample sanitize request

POST /sanitize HTTP/1.1
Host: localhost:8080
Content-Type: application/json
X-API-Key: pk_live_••••••••••••••••

{
  "text": "Contact Jane Doe at jane.doe@acme.co.nz or +64 21 555 1234.",
  "policy": "default"
}

---

HTTP/1.1 200 OK
Content-Type: application/json

{
  "sanitized": "Contact <PERSON> at <EMAIL_ADDRESS> or <PHONE_NUMBER>.",
  "entities": [
    { "type": "PERSON", "start": 8, "end": 16, "score": 0.91 },
    { "type": "EMAIL_ADDRESS", "start": 20, "end": 38, "score": 0.99 },
    { "type": "PHONE_NUMBER", "start": 42, "end": 58, "score": 0.97 }
  ],
  "policy_version": "2026-03",
  "latency_ms": 42
}

# batch ingest (scheduled)
# PostgreSQL export → CSV inbox → APScheduler job → S3 outbox`,

  "terminal-log": `$ ada status
profile: default
db: ~/.ada/profiles/default/state.sqlite
worker: running (pid 4821)
token_budget: 12000 remaining

$ ada chat "summarize today's RSS ingest"
[agent] loading tools: rss_fetch, sqlite_query, shell_allowlist
[tool] rss_fetch → 14 items from 3 feeds
[tool] sqlite_query → INSERT ingest_queue (14 rows)
[agent] queued 3 goals for background worker

$ ada worker --once
[worker] goal: draft_seo_page slug=em-bail-accommodation
[tool] search_console → impressions=142, ctr=6.2%
[tool] s3_put → s3://site-pages/em-bail-accommodation.html
[worker] done — quality gate passed`,

  metrics: `GSTF — Deepfake Video Attribution (Master's thesis)

held-out accuracy (FaceForensics++, ArcFace): 86.5%
backbone: R(2+1)D + ArcFace metric learning
continual learning: Elastic Weight Consolidation (EWC)

pipeline phases
  1. ingest   — short face clips, frame sampling
  2. encode   — R(2+1)D spatio-temporal features
  3. attribute— ArcFace embedding → generator class
  4. adapt    — EWC fine-tune on new generators

attribution flow (ASCII)
  video clip ──► R(2+1)D ──► ArcFace head ──► generator label
                    │              │
                    └── Grad-CAM ──┘  (spatial heatmap)

datasets: FaceForensics++, DFDM
runner: YAML-driven experiments, Dockerised training`,
};

export function getExhibitContent(variant: ExhibitVariant): string {
  return exhibitContent[variant];
}
