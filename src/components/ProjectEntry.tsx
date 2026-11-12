import Link from "next/link";

import { ProjectLinks } from "@/components/ProjectLinks";
import { StatusStamp } from "@/components/StatusStamp";
import type { Project } from "@/lib/portfolio-schema";

/** One numbered catalogue entry on the home page, e.g. "01 — Prism". */
export function ProjectEntry({ project, number }: { project: Project; number: number }) {
  return (
    <li className="entry project-entry">
      {project.face && (
        // Plain <img>: faces are fixed 1200×630 files already in public/, so next/image adds nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="project-face" src={project.face} alt="" width={1200} height={630} loading="lazy" />
      )}
      <h3 className="entry-title">
        <span className="entry-number">{String(number).padStart(2, "0")} — </span>
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
      </h3>
      <p>{project.summary}</p>
      <p className="project-proves">
        <span className="label">Proves</span> {project.proves}
      </p>
      <StatusStamp status={project.status} />
      <ProjectLinks links={project.links} />
    </li>
  );
}
