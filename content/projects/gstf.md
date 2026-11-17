---
title: GSTF
summary: "Research on telling which tool made a deepfake video, not just whether it's fake."
why: "I picked an AI thesis because I wanted to understand the models and the maths inside them. Deepfakes are now easy to make and are used for fraud and fake imagery, so knowing a video is fake often isn't enough; knowing which tool made it helps trace where it came from."
thread: research
tier: featured
order: 5
status: { state: wip, as_of: 2026-11-14, note: "Thesis done; journal paper in preparation" }
role: Solo, Master's thesis
dates: Feb 2025 – Jul 2026
stack: [Python, PyTorch]
proves: Research rigour
proof: ["Master's thesis, graded A-", "Journal paper in preparation"]
face: /projects/gstf/face.svg
visibility: { code: private, cannot_show: "Code and paper stay private until the paper is submitted" }
---

## The problem

Most deepfake research asks "is this video fake?". I asked which tool made it. On FaceForensics++, that means telling real videos apart from two different face-swap methods. If you can name the tool, you know more about where a fake came from.

## What I built

I trained a video model, R(2+1)D, which looks at a short clip in space and time, then added a second stage (ArcFace) meant to pull each tool's videos into tighter groups. I compared it with a simpler frame-by-frame model, and tested whether timing matters by shuffling the frames or repeating one frame. Then I tested it on a different dataset, DFDM, without training on it.

What the thesis found:

- **On the dataset it learned from, it works.** About 87% of validation clips went to the right tool (chance is 33%).
- **Movement matters, order doesn't.** One repeated frame dropped accuracy to 70%; shuffling the frames barely changed it.
- **ArcFace made no measurable difference.**
- **On new videos, it failed.** On DFDM, never seen in training, it scored at chance.

## The key decision

After the thesis, I noticed something in my own results that didn't add up. In both datasets, every original video is turned into a fake by every tool, so the same source video appears once under every label. A random split, which is what the papers I reviewed use, puts copies of the same source on both sides: in training with one label, and in validation with another.

I went back through every claim and every number, traced each one to the file it came from, and marked it keep, reword or remove. Some claims didn't hold, and I withdrew them. Then I turned the bug itself into the question: what does that overlap do to the scores?

That's the paper I'm writing now. It shows the overlap can push a model towards the wrong answer on one dataset, and it recommends splitting these datasets by source video and reporting how often a model copies the label of a same-source clip. One experiment is still running.

What it cost: months of extra work after the thesis was graded, and a thesis-sized set of claims cut down to the ones that hold.

## What I learned

A model scoring well on its own dataset tells you very little. The real test is data it has never seen, and a split that can't leak. And when a number looks odd, it's worth chasing: the bug I found in my own setup turned out to be a better research question than the one I started with.

## What it can't do

- Thesis numbers come from a random split, the very issue the paper studies; I say so next to them.
- Attribution fails across datasets; this is research, not a working tool.
- Code and paper are private until submission; one experiment is pending.

## What's next

Finish the last experiment, then submit the journal paper. I'll link the preprint here when it's out.
