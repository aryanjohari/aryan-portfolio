import type { PortfolioYaml } from "@/lib/projects";

export const mockProjects: Record<string, PortfolioYaml> = {
  "background-studio": {
    title: "Background Studio",
    slug: "background-studio",
    summary:
      "Browser-based visual synthesizer with GLSL shader pipeline and preset export.",
    description:
      "A WebGL-first image lab where uploaded rasters pass through a single full-screen fragment shader. Parameters drive UV distortion, duotone mapping, halftone, scanlines, and procedural grain in real time. Presets serialize to JSON for reuse across sessions.",
    stack: ["TypeScript", "Three.js", "React Three Fiber", "GLSL"],
    status: "active",
    links: {
      github: "https://github.com/aryanjohari/background-studio",
      demo: "https://background-studio.example.com",
    },
  },
  "sound-visualiser": {
    title: "Sound Visualiser",
    slug: "sound-visualiser",
    summary:
      "Real-time audio spectrum and waveform renderer driven by Web Audio API.",
    description:
      "Captures microphone or file input via the Web Audio API and renders frequency bins and waveform data to a 2D canvas. Supports adjustable FFT size, smoothing, and colour mapping modes for live performance and debugging audio pipelines.",
    stack: ["JavaScript", "Web Audio API", "Canvas 2D"],
    status: "active",
    links: {
      github: "https://github.com/aryanjohari/sound-visualiser",
    },
  },
  "pii-gateway": {
    title: "PII Gateway",
    slug: "pii-gateway",
    summary:
      "FastAPI middleware that detects and redacts PII using Microsoft Presidio.",
    description:
      "A drop-in API gateway that scans inbound text for personally identifiable information — names, emails, phone numbers, credit cards — and returns redacted output or structured entity reports. Includes an interactive playground for testing detection rules without deploying upstream services.",
    stack: ["Python", "FastAPI", "Presidio", "Docker"],
    status: "active",
    links: {
      github: "https://github.com/aryanjohari/pii-gateway",
      docs: "https://github.com/aryanjohari/pii-gateway#readme",
    },
  },
  ada: {
    title: "ADA",
    slug: "ada",
    summary: "Edge status dashboard for a Raspberry Pi home automation node.",
    description:
      "ADA monitors sensor readings, GPIO state, and service health on a Raspberry Pi deployed at the edge. A lightweight HTTP API exposes live status; the portfolio proxies requests through Next.js so the device URL never reaches the client.",
    stack: ["Python", "Raspberry Pi", "Flask", "GPIO"],
    status: "wip",
    links: {
      github: "https://github.com/aryanjohari/ada",
    },
  },
  gstf: {
    title: "GSTF",
    slug: "gstf",
    summary: "Grad-CAM interpretability toolkit for convolutional classifiers.",
    description:
      "Generates gradient-weighted class activation maps to visualize which input regions drive model predictions. Ships with evaluation metrics (IoU, pointing game) and static exhibit artifacts — heatmap overlays and metric tables — for model comparison without requiring a live inference server.",
    stack: ["Python", "PyTorch", "Grad-CAM", "NumPy"],
    status: "archived",
    links: {
      github: "https://github.com/aryanjohari/gstf",
    },
  },
};
