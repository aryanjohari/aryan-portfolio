import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Aryan Johari",
  description: "Bio, education, and availability.",
};

export default function AboutPage() {
  return (
    <>
      <h1 className="page-heading">about</h1>

      <section className="about-section">
        <p>
          I build software that solves real problems — from visual tools to edge
          systems. I own the full stack: architecture, APIs, and deployment. This
          portfolio is a curated workshop index with narrative context and live
          demos where wired.
        </p>
      </section>

      <section className="about-section">
        <h2>education</h2>
        <p>Master of Technology - Computing, Unitec, Auckland — July 2026.</p>
        <p>Bachelor of Science in Computer Science, University of Mumbai — March 2024.</p>
      </section>

      <section className="about-section">
        <h2>availability</h2>
        <p>
          Seeking a graduate software engineering role in Auckland from
          September 2026.
        </p>
      </section>

      <Link href="/resume.pdf" className="resume-link">
        download resume.pdf
      </Link>
    </>
  );
}
