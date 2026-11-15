---
title: Sound Visualiser
summary: "Music visuals in the browser: play a song or use your mic, and a full-screen scene moves with it."
why: "I wanted to learn how to change an image and a webcam feed so they match the mood of the music."
thread: web
tier: featured
order: 4
status: { state: live, as_of: 2026-11-14, note: "Frozen at v1" }
role: Solo
dates: Mar 2026 – Oct 2026
stack: [TypeScript, Three.js, GLSL, Web Audio]
proves: Real-time graphics and audio in the browser
proof: ["18 unit tests", "CI: type checks, lint, tests and build", "Live demo"]
links:
  demo: https://music.arkhives.nz
  github: https://github.com/aryanjohari/sound-visualiser
visibility: { code: public }
---

## The problem

Most music visualisers just jump with the volume: loud means big, quiet means small. That reacts to the sound, but it doesn't feel like the music. A ballad and a dance track end up looking the same, only bigger or smaller.

I wanted visuals that follow the mood and the beat of a song, and change an image or a webcam feed to match it, all in the browser with nothing uploaded. That meant working out what the sound is doing (its energy, its mood, where the beats fall) before drawing anything.

## What I built

Pick a sound source: your microphone, a file, or the demo track. Optionally add your webcam. There are three looks: a cinematic 3D scene, a sharp webcam view that pulses with the music, and an acid mode that feeds each frame into the next.

It tries to feel musical, not just jumpy. Before anything reaches the graphics, the sound is turned into an energy level, a mood (calm, groove, intense) and a beat grid. Visuals snap to the beat only as much as it's confident about the tempo, so unclear rhythms just flow.

Every signal measures itself against its own recent peak, so a quiet song and a loud one both use the full range, with no volume knob. A look can be saved as a small file and reloaded on another track, and "Keep" records up to 30 seconds of the canvas with its sound. Nothing leaves the browser.

## The key decision

**Make sense of the sound first, then draw.**

Raw audio is noisy, so nothing goes straight to the graphics. First the maths and physics of the sound: energy in each band, how it changes, where the beats fall. Then that's turned into a few clear things: an energy level, a mood, a beat grid with a confidence score. Every signal is calibrated against its own recent peak, so each song uses the full range. Only then do the visuals read those values.

What it cost: because every song is scaled to its own peaks, quiet passages get boosted, so it never fully rests.

## What I learned

Audio has a lot going on. It's much easier to understand it if you analyse it first and update a small state, then let the pixels follow that state, instead of changing pixels on the fly as the sound streams in. That idea is what Phosphene is built on.

Also: "does it feel right?" can't be unit-tested. The tests cover the logic (look file, tempo vote, mood), and the rest I checked by listening.

## What it can't do

- Tempo guessing is weak on ballads, ambient music and speech; outside 60–180 BPM it reads half or double time.
- Heavy shaders: low-end GPUs will struggle.
- Only the logic is tested; how it looks and feels was checked by hand.

## What's next

Frozen at v1. Its sound side carries on in [Phosphene](/projects/phosphene), together with Prism's image side.
