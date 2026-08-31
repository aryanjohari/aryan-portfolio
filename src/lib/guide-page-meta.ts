/**
 * Hand-authored page blurbs for the Portfolio Guide.
 * Used for hybrid static short-circuits and as the model page slice.
 * Do not invent UI chrome — describe route intent only.
 */

export type GuidePageMeta = {
  pathname: string;
  title: string;
  /** 3–5 line curator blurb for explain/summarize short-circuit. */
  blurb: string;
  /** One concrete next path suggestion. */
  nextPath?: string;
};

const STATIC_PAGES: GuidePageMeta[] = [
  {
    pathname: "/",
    title: "Home",
    blurb:
      "You’re on Aryan’s home — a quiet void with his name and the portfolio guide ask bar. This is the primary front door: ask about his work, hiring status (available from September 2026 in Auckland), or which project to explore. Live demos include Background Studio and Sound Visualiser.",
    nextPath: "/projects",
  },
  {
    pathname: "/about",
    title: "About",
    blurb:
      "You’re on the about page — a short essay on why and how Aryan codes: systems thinking, research-first builds, and the projects he ships. He’s seeking a graduate role in Auckland from September 2026 (PSW, no sponsorship). Ask the guide for specifics or open /resume.pdf for metrics.",
    nextPath: "/projects",
  },
  {
    pathname: "/projects",
    title: "Projects",
    blurb:
      "You’re on the projects index — a curated gallery of selected work with narrative and live demos where available. Open any project for a deeper exhibit. Live demos include Background Studio and Sound Visualiser.",
    nextPath: "/about",
  },
  {
    pathname: "/workshop",
    title: "Projects",
    blurb:
      "Legacy /workshop URL — same as /projects. You’re on the curated projects gallery; open any project for the full exhibit, or ask what to look at next.",
    nextPath: "/about",
  },
];

const PROJECT_PATH = /^\/projects\/([a-z0-9-]+)\/?$/i;

export function normalizeGuidePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
}

export function extractProjectSlug(pathname: string): string | undefined {
  const match = normalizeGuidePathname(pathname).match(PROJECT_PATH);
  return match?.[1]?.toLowerCase();
}

export function getStaticPageMeta(
  pathname: string,
): GuidePageMeta | undefined {
  const normalized = normalizeGuidePathname(pathname);
  return STATIC_PAGES.find((page) => page.pathname === normalized);
}

export function buildProjectPageMeta(project: {
  slug: string;
  title: string;
  summary: string;
  description?: string;
  stack: string[];
  demo?: boolean;
}): GuidePageMeta {
  const demoNote = project.demo
    ? " This one has a live demo you can try in the browser."
    : "";
  const detail =
    project.description?.trim() ||
    project.summary.trim() ||
    "A selected project from Aryan’s portfolio.";

  return {
    pathname: `/projects/${project.slug}`,
    title: project.title,
    blurb: `You’re looking at ${project.title} — ${detail.slice(0, 320).trim()}${detail.length > 320 ? "…" : ""}${demoNote} Stack highlights: ${project.stack.slice(0, 6).join(", ")}.`,
    nextPath: "/projects",
  };
}
