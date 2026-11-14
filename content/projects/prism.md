---
title: Prism
summary: A browser photo-styling tool where you pick a look, tune or describe it, and export the PNG with its recipe.
thread: web
tier: featured
order: 1
status: { state: frozen, as_of: 2026-10-23, note: "v1 finished; ideas continue in Phosphene" }
role: Solo
dates: Apr 2026 – Oct 2026
stack: [TypeScript, React, WebGL2, Vitest]
proves: Frontend craft and testing my own work
proof: ["120 tests", "CI: lint, tests and build on main and PRs", "Live demo"]
links:
  demo: https://image.arkhives.nz
  github: https://github.com/aryanjohari/web-image-editor
visibility: { code: public }
---

## The problem

I wanted photo looks that come out the same every time, where a typed recipe decides the pixels and not a model.

## What I built

Eight named look packs, semantic sliders and an optional talk box all edit one recipe document, which a WebGL2 compositor renders and exports as a PNG plus JSON.

## The key decision

The talk box is a structured router onto packs and sliders, never generated pixels, so every result can be rebuilt from its recipe.

## What I learned

Writing down what Prism would refuse (generated pixels, campaign tooling) and a short spec before each build step is what kept a solo project small enough to finish. The version before it in the same repo, Stage, had drifted into a jobs API and campaign packs.

## What it can't do

TODO: confirm this list (draft in drafts/prism.md).

- It never adds or removes anything in the picture.
- The talk box reads your words, not the photo.
- It finds one person only, and has eight looks.
- The tests cover the logic, not what the GPU draws; I checked that by hand.

## What's next

Frozen at v1. The typed look document and validated talk router continue in Phosphene.
