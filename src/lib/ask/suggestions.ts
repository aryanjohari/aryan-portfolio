/**
 * The Ask box's suggestion chips for the page the visitor is on, so the box shows
 * it knows the site. Built from the project list the layout passes down. Pure.
 */

/** Project pages by path, e.g. "/projects/prism". */
export type AskPages = Record<string, { title: string; hasDemo: boolean }>;

const EVERY_PAGE = ["I'm hiring: the 30-second version", "Email Aryan"];

export function suggestionsFor(path: string, pages: AskPages): string[] {
  if (path === "/") return ["Which project should I look at first?", "Take me to the long story", ...EVERY_PAGE];

  const project = pages[path];
  if (project) {
    return [
      `What was hard about ${project.title}?`,
      "Why this key decision?",
      ...(project.hasDemo ? ["Show me the demo"] : []),
      ...EVERY_PAGE,
    ];
  }
  return EVERY_PAGE;
}
