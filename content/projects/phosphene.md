---
title: Phosphene
summary: "Turns photos into line drawings and, later, art that moves with music."
why: "I wanted to learn how pixels, maths and code fit together, and how sound can change an image, the way water shows sound as patterns. It sits where maths, code, sound and image meet."
thread: web
tier: in-progress
order: 2
status: { state: wip, as_of: 2026-11-14, note: "Images done, webcam started, music next" }
role: Solo
dates: Nov 2026 – present
stack: [TypeScript, Canvas 2D, Vite, Vitest]
proves: Creative engineering
proof: ["389 tests", "CI"]
face: /projects/phosphene/face.jpg
visibility: { code: private, cannot_show: "Private and not deployed yet" }
---

## The problem

A phosphene is the light you see when you close your eyes and press on them: patterns that come from inside, not from what you're looking at.

I'd built two separate things: [Prism](/projects/prism), which changes how a photo looks, and [Sound Visualiser](/projects/sound-visualiser), which makes visuals move with music. Each one taught me half of what I wanted. I wanted one place where an image and a sound meet: a photo, and later a live webcam, turned into line art that moves with the music I'm playing. To get there, I first had to work out which maths actually turns pixels into good lines, and whether it can run fast enough to keep up with sound.

## What I built

You load a photo, and Phosphene finds its edges and brightness, then draws over it in layers: lines between edge points (Delaunay and others), marks on the edges, stipple dots placed by tone, dithering in a two-colour print palette, and contour lines like a topographic map or an engraving.

Each layer can be switched on and off, with its own opacity and blend mode. There are eight palettes and seven presets, and a button that makes a random look from a seed. You can crop to social-media shapes and export a PNG. The same photo and seed always give the same picture.

A first webcam source and a Play page went in on 10 Nov, with a benchmark of real frame times.

## The key decision

The decisions here are the questions the project is about: how to keep it smooth, which maths actually works, and how far I can push the maths on an image and on sound.

So far that's meant:

- **Find out which maths works, in plain code first.** Edge detection, point sampling, triangulation, contours and dithering are plain TypeScript with unit tests, so I can try one idea against another before worrying about the page.
- **Measure smoothness before promising it.** I timed each frame before building the webcam: at 320×240 the light looks run at 30 fps on an M1; at 640×480 the analysis alone takes about 30 ms. Video stays small until that's solved.
- **Canvas first, WebGL only if needed.** The opposite of Prism, so I can see where the plain approach runs out.

What it cost: slower to get something on screen, and video isn't smooth at full size yet.

## What I learned

- **Measure before you promise.** The timing study showed that 640×480 video takes about 30 ms just for analysis, before any drawing. Without measuring, I'd have promised smooth video it can't do yet.
- **Plain code makes maths easy to compare.** Because edge detection, triangulation and contours are plain tested TypeScript, I could try one idea against another in minutes, not rewrite the page each time.

## What it can't do

- No music yet; that's the next milestone.
- Video is only fast enough at small sizes.
- Export is the preview scaled up, so very fine lines are only as sharp as the preview.
- A browser can't read Spotify directly; the plan is an uploaded file or macOS loopback (BlackHole).
- One user (me), no measurements beyond the timing study.

## What's next

Very early, and I have a lot planned. It becomes my main creative project, bringing [Prism](/projects/prism)'s image work and [Sound Visualiser](/projects/sound-visualiser)'s audio work together. Next: music drives the lines (a file, or what's playing on the Mac), then live webcam, then talk steering ("sparse, gold on black" changes the look).
