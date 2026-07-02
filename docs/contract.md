# portfolio.yaml Contract

Each curated project repo should include a `portfolio.yaml` at its root. This file is the **visitor-facing content contract** — not a replacement for the README.

To generate this file in a project repo, use the Cursor prompt in [create-portfolio-yaml.md](./create-portfolio-yaml.md).

## Schema

```yaml
title: string          # Display name on index and project page
slug: string           # Optional; defaults to repo name (kebab-case)
summary: string        # One line for index row
description: string    # 2–6 sentences: what it does, for visitors before demo
stack: string[]        # Technologies, e.g. [Python, FastAPI, Presidio]
status: active | wip | archived
links:
  github: string       # Required — full GitHub repo URL
  demo?: string        # Optional external demo URL (registry overrides for embedded demos)
  docs?: string        # Optional documentation URL
```

## TypeScript alignment

```typescript
type ProjectStatus = "active" | "wip" | "archived";

type PortfolioLinks = {
  github: string;
  demo?: string;
  docs?: string;
};

type PortfolioYaml = {
  title: string;
  slug?: string;
  summary: string;
  description: string;
  stack: string[];
  status: ProjectStatus;
  links: PortfolioLinks;
};
```

Merged with registry into:

```typescript
type Project = PortfolioYaml & {
  slug: string;
  repo: string;
  demo?: DemoConfig; // from registry only
};
```

## Validation rules

| Field | Rule |
|-------|------|
| `title` | Required, non-empty string |
| `slug` | Optional; if omitted, derived from repo name. Must be kebab-case. |
| `summary` | Required, ≤120 chars recommended for index table |
| `description` | Required, 2–6 sentences |
| `stack` | Required, non-empty array of strings |
| `status` | Required, one of `active`, `wip`, `archived` |
| `links.github` | Required, valid GitHub URL |
| `links.demo` | Optional URL; used only when no registry demo is wired |
| `links.docs` | Optional URL |

Build should fail (or warn) on missing required fields or invalid status values.

## Status semantics

| Status | Meaning | Index display |
|--------|---------|---------------|
| `active` | Maintained, representative work | `active` |
| `wip` | In progress, may be incomplete | `wip` |
| `archived` | Historical, no longer maintained | `archived` |

## Examples

### background-studio

```yaml
title: Background Studio
slug: background-studio
summary: Browser-based visual synthesizer with GLSL shader pipeline and preset export.
description: >
  A WebGL-first image lab where uploaded rasters pass through a single
  full-screen fragment shader. Parameters drive UV distortion, duotone mapping,
  halftone, scanlines, and procedural grain in real time. Presets serialize
  to JSON for reuse across sessions.
stack:
  - TypeScript
  - Three.js
  - React Three Fiber
  - GLSL
status: active
links:
  github: https://github.com/aryanjohari/background-studio
  demo: https://background-studio.example.com
```

### sound-visualiser

```yaml
title: Sound Visualiser
slug: sound-visualiser
summary: Real-time audio spectrum and waveform renderer driven by Web Audio API.
description: >
  Captures microphone or file input via the Web Audio API and renders frequency
  bins and waveform data to a 2D canvas. Supports adjustable FFT size, smoothing,
  and colour mapping modes for live performance and debugging audio pipelines.
stack:
  - JavaScript
  - Web Audio API
  - Canvas 2D
status: active
links:
  github: https://github.com/aryanjohari/sound-visualiser
```

### pii-gateway

```yaml
title: PII Gateway
slug: pii-gateway
summary: FastAPI middleware that detects and redacts PII using Microsoft Presidio.
description: >
  A drop-in API gateway that scans inbound text for personally identifiable
  information — names, emails, phone numbers, credit cards — and returns redacted
  output or structured entity reports. Built-includes an interactive playground
  for testing detection rules without deploying upstream services.
stack:
  - Python
  - FastAPI
  - Presidio
  - Docker
status: active
links:
  github: https://github.com/aryanjohari/pii-gateway
  docs: https://github.com/aryanjohari/pii-gateway#readme
```

### ada

```yaml
title: ADA
slug: ada
summary: Edge status dashboard for a Raspberry Pi home automation node.
description: >
  ADA monitors sensor readings, GPIO state, and service health on a Raspberry Pi
  deployed at the edge. A lightweight HTTP API exposes live status; the portfolio
  proxies requests through Next.js so the device URL never reaches the client.
stack:
  - Python
  - Raspberry Pi
  - Flask
  - GPIO
status: wip
links:
  github: https://github.com/aryanjohari/ada
```

### gstf

```yaml
title: GSTF
slug: gstf
summary: Grad-CAM interpretability toolkit for convolutional classifiers.
description: >
  Generates gradient-weighted class activation maps to visualize which input
  regions drive model predictions. Ships with evaluation metrics (IoU, pointing
  game) and static exhibit artifacts — heatmap overlays and metric tables — for
  model comparison without requiring a live inference server.
stack:
  - Python
  - PyTorch
  - Grad-CAM
  - NumPy
status: archived
links:
  github: https://github.com/aryanjohari/gstf
```

## What not to put in portfolio.yaml

- Full README content (keep README for contributors)
- API keys, secrets, or private URLs
- Demo embed configuration (that belongs in the portfolio registry)
- Build instructions or changelog entries
