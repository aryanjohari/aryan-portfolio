/**
 * How a project's facts read on the home page and on its own page.
 * Pure: callers pass in what getProjects() returns.
 */

import type { Project } from "./portfolio-schema";

export const STATE_WORDS: Record<Project["status"]["state"], string> = {
  live: "Live",
  frozen: "Finished",
  wip: "In progress",
};

/** The home row's one proof line, e.g. "Live · 120 tests · Frozen at v1". */
export function proofLine(project: Project): string {
  return [STATE_WORDS[project.status.state], project.proof[0], project.status.note].filter(Boolean).join(" · ");
}

/** The project page's facts, shown as one line of short items. */
export function factsLine(project: Project): string[] {
  return [project.role, project.stack.slice(0, 3).join(", "), ...project.proof, STATE_WORDS[project.status.state]];
}

/** The next project with a page, in home page order, wrapping to the first; none if it's the only one. */
export function nextProject(projects: Project[], slug: string): Project | undefined {
  const withPages = projects.filter((project) => project.story);
  const index = withPages.findIndex((project) => project.slug === slug);
  if (index === -1 || withPages.length < 2) return undefined;
  return withPages[(index + 1) % withPages.length];
}
