import type { Metadata } from "next";
import Link from "next/link";

import { AboutScrollDrama } from "@/components/AboutScrollDrama";

export const metadata: Metadata = {
  title: "About — Aryan Johari",
  description:
    "Why and how Aryan codes — systems, AI, and research, from thesis work to shipped tools in Auckland.",
};

export default function AboutPage() {
  return (
    <article className="about-page" data-void-scroll>
      <AboutScrollDrama />
      <header className="about-intro">
        <h1 className="page-heading">about</h1>
      </header>

      <div className="about-body about-essay">
        <p>
          I&apos;m a graduate software engineer in Auckland. I build things at
          the intersection of systems, AI, and research — from browser tools
          you can touch to APIs and pipelines you can ship.
        </p>

        <blockquote className="about-pullquote">
          I think in systems — how data moves, where failures show up, and what
          a maintainer has to touch six months later.
        </blockquote>

        <p>
          I like learning by making. I read what&apos;s already there, cite
          limits honestly, then prototype until something works for a real
          person — not a slide deck. AI speeds up delivery; the architecture
          and the call on what to ship are mine.
        </p>

        <p>
          Research first, then build. For my Master&apos;s thesis (GSTF) that
          meant video-level deepfake <em>generator</em> attribution — R(2+1)D,
          metric learning, measuring what breaks under domain shift — not
          claiming a production detector. For PII Gateway and ADA, it meant
          understanding the operator&apos;s constraint (redact before data
          leaves; run an agent on your own hardware) and designing gateways,
          policies, and workflows around that. Side branches and rewrites are
          part of the process: explore, measure, cut what doesn&apos;t hold.
        </p>

        <p>
          Visual systems in the browser (Background Studio, Sound Visualiser),
          privacy-aware APIs (PII Gateway), and local agent tooling (ADA).
          This site is a curated workshop for that work — context and demos, not
          a README dump. Open a project to see the story; ask the guide if you
          want a shortcut.
        </p>

        <p>
          I completed my Master of Applied Technology at Unitec in July 2026.
          I&apos;m looking for a graduate or junior software engineering role in
          Auckland from September 2026. Eligible to work in New Zealand on a
          Post Study Work Visa — no sponsorship required. Details and metrics
          live in the resume; the guide can answer specifics.
        </p>

        <footer className="about-footer">
          <a href="/resume.pdf" className="about-resume-cta">
            download resume.pdf
          </a>
          <p className="about-bridge">
            <Link href="/">ask on home</Link>
            <span className="about-bridge-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/projects">projects</Link>
          </p>
        </footer>
      </div>
    </article>
  );
}
