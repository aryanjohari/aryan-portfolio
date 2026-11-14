---
title: Prism
summary: "Change a photo's look in your browser, then download it with the recipe that made it."
why: "I wanted to learn WebGL and edit my own photos with the maths behind it: pixels, matrices, sliders and curves."
thread: web
tier: featured
order: 1
status: { state: frozen, as_of: 2026-10-23, note: "v1 finished; ideas continue in Phosphene" }
role: Solo
dates: Apr 2026 – Oct 2026
stack: [TypeScript, React, WebGL2, Vitest]
proves: Frontend craft and testing my own work
proof: ["120 tests", "CI: lint, tests and build", "Live demo"]
links:
  demo: https://image.arkhives.nz
  github: https://github.com/aryanjohari/web-image-editor
visibility: { code: public }
---

## The problem

I edit my own photos, and I wanted to understand what an editor actually does when you drag a slider or bend a curve. Underneath, it's maths on pixels: matrices, colour curves, blurs. I wanted to write that maths myself and run it on the GPU, so I picked WebGL.

I also wanted a look to be something you can write down. These settings, this grade, this much grain. Then the same recipe always gives the same picture, and you can save it or share it.

## What I built

You upload a photo and pick one of eight looks, such as warm film, flash, editorial black-and-white or poster. Each look has a few sliders that make sense for it: intensity, grain, fade, blur. If there's a person in the photo, Prism finds them on your device, so you can keep them in colour and mute the background.

You can also type what you want: "more grain", "warmer", "move the title up". Gemini reads that and answers only with which look and slider values to use. The app checks the answer before applying it. Typing and moving a slider change the same recipe, so they never disagree.

The picture is drawn on your GPU. When you export, you get the full-size PNG, the recipe as a file, and a link that rebuilds the look. Your photo never leaves your browser.

- The recipe is a typed schema; anything invalid is refused, not guessed.
- The person mask runs in a Web Worker so the page doesn't freeze.
- Preview and export share the same drawing code, so what you see is what you download.

## The key decision

Browser only, maths only. No generated pixels.

I knew from the start I didn't want an image model repainting the photo. The point was to change pictures with maths I wrote myself, running in the browser. So when I added a talk box, it doesn't draw anything: it turns your words into a look and some slider values, the app checks them, and the same maths draws the result. Every picture can be rebuilt from its recipe.

What that cost: Prism can't do anything the sliders can't, so "add a sunset" is out. And the talk box can misread you, because it only sees your words, not the photo.

## What I learned

Before writing code, I wrote down what Prism would refuse to do: no generated pixels, no marketing tools, no Canva-style layouts. Then I wrote a short spec before each step and built only what it said.

The version before it, in the same repo, didn't work that way. It was called Stage, and I was trying to turn it into a commercial product for other users. That idea didn't pan out. It grew a jobs API and campaign packs and became complicated and redundant, so I stopped and started again as Prism, smaller and for me.

The hard parts weren't where I expected. Getting WebGL right and keeping it fast took the most time, and so did getting Gemini to reliably return a recipe in the exact JSON shape the app would accept.

## What it can't do

- It never adds or removes anything in the picture.
- The talk box reads your words, not the photo.
- It finds one person only.
- Eight looks only.
- One line of text, in three positions.
- The tests cover the logic, not what the GPU draws; I checked that by hand.

## What's next

Prism was for learning. Once v1 taught me what I wanted, I froze it and took those ideas into [Phosphene](/projects/phosphene), which is still early.
