import Link from "next/link";

import type { Project } from "@/lib/portfolio-schema";

/** What's being built right now: the page's one tinted band. */
export function NowBand({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;
  return (
    <section className="now-band" aria-labelledby="now-heading">
      <div className="grid">
        <div className="left-3">
          <h2 id="now-heading" className="section-no">
            No. 04 · Now<span className="dot" aria-hidden="true" />
          </h2>
        </div>
        <ul className="mid-5">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/projects/${project.slug}`}>{project.title}</Link> · {project.summary}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
