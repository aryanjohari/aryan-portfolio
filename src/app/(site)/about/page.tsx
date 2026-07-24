import type { Metadata } from "next";
import Link from "next/link";

import { AboutAnchorNav } from "@/components/AboutAnchorNav";

export const metadata: Metadata = {
  title: "About — Aryan Johari",
  description: "Philosophy, background, education, and availability.",
};

export default function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-intro">
        <h1 className="page-heading">about</h1>
        <p className="about-lede">
          Who I am, how I work, and what I’m looking for next.
        </p>
      </header>

      <div className="about-layout">
        <AboutAnchorNav />

        <div className="about-body">
          <section id="philosophy" className="about-section">
            <h2>philosophy</h2>
            <blockquote className="about-pullquote">
              I think in systems — how data moves, where failures show up, and
              what a maintainer has to touch six months later.
            </blockquote>
            <p>
              I build software that solves real problems, from ML research
              pipelines to privacy-aware APIs and WebGL front ends.
            </p>
            <p>
              I own the architecture: APIs, deployment, and the trade-offs. AI
              speeds up delivery, but the design decisions are mine. This
              portfolio is a curated workshop — selected projects with context,
              not a README dump.
            </p>
          </section>

          <section id="background" className="about-section">
            <h2>background</h2>
            <p>
              I recently completed a Master of Applied Technology in Computing
              at Unitec, Auckland. My thesis (GSTF) built a PyTorch pipeline for
              video-level deepfake generator attribution — R(2+1)D features,
              ArcFace metric learning, and continual learning under domain
              shift. Held-out accuracy on FaceForensics++ reached 86.5%.
            </p>
            <p>
              Before grad school I worked as an SEO Specialist at Specialist
              Support Services in Auckland — scaling organic impressions 414%
              over an 11-month GSC window across three sites, with hands-on
              indexing workflows and mobile-first page templates.
            </p>
            <p>
              Earlier, as a Junior Website Developer at KRIL Digital in Mumbai,
              I built and maintained around 20 client sites (WordPress, React,
              Shopify) and improved load times and search visibility through
              daily iteration.
            </p>
          </section>

          <section id="education" className="about-section">
            <h2>education</h2>
            <p>
              Master of Applied Technology — Computing, Unitec Institute of
              Technology, Auckland (Feb 2025 – June 2026).
            </p>
            <p>
              Bachelor of Science in Computer Science, Thakur College of Science
              and Commerce, Mumbai (Sep 2021 – Apr 2024).
            </p>
          </section>

          <section id="availability" className="about-section">
            <h2>availability</h2>
            <p>
              Seeking a graduate / junior software engineering role in Auckland
              from September 2026. Eligible to work in New Zealand (Post Study
              Work Visa; no sponsorship required).
            </p>
          </section>

          <footer className="about-footer">
            <a href="/resume.pdf" className="about-resume-cta">
              download resume.pdf
            </a>
            <p className="about-bridge">
              <Link href="/">ask on home</Link>
              <span className="about-bridge-sep" aria-hidden="true">
                ·
              </span>
              <Link href="/workshop">workshop</Link>
            </p>
          </footer>
        </div>
      </div>
    </article>
  );
}
