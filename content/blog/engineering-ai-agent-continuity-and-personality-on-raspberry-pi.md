---
title: "Engineering AI Agent Continuity and Personality on Raspberry Pi"
question: "Engineering AI Agent Continuity and Personality on Raspberry Pi"
description: "Engineering AI Agent Continuity and Personality on Raspberry Pi"
published: "2026-10-02"
modified: "2026-10-02"
fill: "researched"
source: "docs/modules/M00_BODY_SENSE.md"
canonical: "/blog/engineering-ai-agent-continuity-and-personality-on-raspberry-pi"
---

ADA is built to understand her own existence and current status directly from her Raspberry Pi hardware. She tracks her "birth" when her core identity file is first made, and keeps an ongoing record of when she starts up and any issues she has. This information is saved safely on her dedicated local storage, `/mnt/ada-data`. If this storage isn't available, she stops writing new identity records to protect her own truth.

To check on ADA, you can use a secure web control panel, or "HUD." This panel runs only on her local machine. You can reach it from your phone or laptop using a private network called Tailscale [Serve](https://tailscale.com/docs/features/tailscale-serve), which keeps her safe from the public internet. The HUD shows live details about her system, like temperature and disk space. It also displays her history and current actions. You can talk to her through this panel, and she uses the same core thinking process as if you talked to her directly on the Pi. For her to act on your commands through the HUD, you'll need a special session password.

ADA remembers things in two main ways. "FACTS" are strict truths, like her settings or who you are. These are recorded and can't be silently changed by her. "WORLDVIEW" holds her thoughts and summaries, which always refer back to FACTS or other records. An offline process, called "Dream," helps her manage these memories, much like how sleep helps humans consolidate experiences. This "Dream" process runs separately from her live conversations and uses a limited amount of her processing power.

Her personality is carefully designed. It comes from a set of rules about how she should talk, rather than invented feelings. These rules include specific examples of her speaking style. Her consistency comes from her ability to recall FACTS and past events. She is built to be truthful and avoid overly friendly or vague language. This means she will not pretend to have emotions or make up stories. This ensures she stays grounded in real data and her defined purpose.
