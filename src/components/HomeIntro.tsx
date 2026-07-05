import Link from "next/link";

type HomeIntroProps = {
  projectCount: number;
  featuredCount: number;
};

export function HomeIntro({ projectCount, featuredCount }: HomeIntroProps) {
  return (
    <section className="home-intro">
      <p className="home-intro-name">aryan johari</p>
      <p className="home-intro-role">graduate software engineer · auckland</p>

      <div className="home-intro-narrative">
        <p>
          I build software that solves real problems — from visual tools to edge
          systems.
        </p>
        <p>
          I own the full stack: architecture, APIs, and deployment; AI
          accelerates delivery but the design is mine.
        </p>
        <p>
          This site is a curated workshop — selected projects with context and
          live demos where wired.
        </p>
      </div>

      <div className="home-intro-stats">
        <span className="home-intro-stat">{projectCount} projects</span>
        <span className="home-intro-stat">{featuredCount} live demos</span>
        <span className="home-intro-stat">
          available from september 2026 · auckland
        </span>
      </div>

      <p className="home-intro-links">
        <Link href="/resume.pdf">resume.pdf</Link>
        <span className="home-intro-links-sep" aria-hidden="true">
          {" "}
          ·{" "}
        </span>
        <Link href="/about">more about me</Link>
      </p>
    </section>
  );
}
