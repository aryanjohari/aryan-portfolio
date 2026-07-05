import Link from "next/link";

type HomeIntroProps = {
  variant?: "home" | "catalog";
  projectCount: number;
  featuredCount?: number;
};

export function HomeIntro({
  variant = "home",
  projectCount,
  featuredCount = 2,
}: HomeIntroProps) {
  return (
    <section className="home-intro">
      <p className="home-intro-role">graduate software engineer · auckland</p>

      {variant === "home" ? (
        <p className="home-intro-narrative home-intro-narrative--compact">
          Full-stack engineer with a backend and ML focus — Python APIs, PyTorch
          research pipelines, and TypeScript front ends. I own architecture and
          deployment; AI accelerates delivery but the design is mine. Available
          in Auckland from September 2026.
        </p>
      ) : (
        <div className="home-intro-narrative">
          <p>
            Full-stack engineer with a backend and ML focus — Python APIs,
            PyTorch pipelines, and TypeScript front ends.
          </p>
          <p>
            I own the full stack: architecture, APIs, and deployment. AI
            accelerates delivery but the design is mine.
          </p>
          <p>
            This site is a curated workshop — selected projects with context and
            live demos where wired.
          </p>
        </div>
      )}

      {variant === "home" ? (
        <>
          <p className="home-intro-demos">
            {featuredCount} live demos →{" "}
            <Link href="/projects/background-studio">background studio</Link>
            <span className="home-intro-links-sep" aria-hidden="true">
              {" "}
              ·{" "}
            </span>
            <Link href="/projects/sound-visualiser">sound visualiser</Link>
          </p>
          <p className="home-intro-catalog-link">
            {projectCount} projects · <Link href="/workshop">view catalog →</Link>
          </p>
        </>
      ) : (
        <div className="home-intro-stats">
          <span className="home-intro-stat">{projectCount} projects</span>
          <span className="home-intro-stat">{featuredCount} live demos</span>
          <span className="home-intro-stat">
            available from september 2026 · auckland
          </span>
        </div>
      )}

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
