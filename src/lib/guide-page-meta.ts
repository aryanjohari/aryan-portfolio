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
      "You’re on Aryan’s home — a quiet void with his name and an ask bar. This is the front door to a curated project portfolio, not a long bio page. From here you can ask about his work, or head into /projects to browse selected builds.",
    nextPath: "/projects",
  },
  {
    pathname: "/about",
    title: "About",
    blurb:
      "You’re on the about page — background on Aryan as a graduate software engineer in Auckland: how he works, what he cares about, and how this portfolio is meant to be read. For employment detail and availability, ask the guide or open /resume.pdf.",
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
    title: "Workshop",
    blurb:
      "You’re on the workshop / projects gallery — a curated set of Aryan’s selected builds. Open a project for the full exhibit, or ask what to look at next.",
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
