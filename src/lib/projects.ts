import type { DemoConfig, RegistryEntry } from "@/data/registry";
import { registry } from "@/data/registry";
import { getLocalArchitectureGraph } from "@/data/architecture-graphs";
import fetchedProjects from "@/lib/fetched-projects.json";
import { mockProjects } from "@/lib/mock-projects";
import type {
  ContentStatus,
  FetchResult,
  FetchedProjectsFile,
  PortfolioLinks,
  PortfolioYaml,
  ProjectDiagramData,
  ProjectStatus,
} from "@/lib/portfolio-schema";

export type {
  ContentStatus,
  PortfolioLinks,
  PortfolioYaml,
  ProjectC4Data,
  ProjectC4DiveTarget,
  ProjectC4Doc,
  ProjectC4Level,
  ProjectC4ZoomTarget,
  ProjectDiagramData,
  ProjectStatus,
} from "@/lib/portfolio-schema";

export type { DemoConfig };

const BASE_DIAGRAM: ProjectDiagramData = { source: "base" };

/**
 * Prefer a validated GitHub graph when present; otherwise fall back to a
 * portfolio-local fixture so pages still render during rollout.
 */
function attachLocalGraphIfMissing(
  diagram: ProjectDiagramData,
  slug: string,
): ProjectDiagramData {
  if (diagram.graph && diagram.graphSource === "github") {
    return diagram;
  }
  const local = getLocalArchitectureGraph(slug);
  if (!local) return diagram;
  return {
    ...diagram,
    graph: local,
    graphSource: "local",
    graphPath: `src/data/architecture-graphs/${slug}.graph.json`,
  };
}

type PlaceholderContent = {
  title: string;
  summary: string;
  description: string;
  stack: string[];
  status: ProjectStatus;
  links: PortfolioLinks;
};

export type Project = {
  slug: string;
  repo: string;
  /** Registry branch used for fetch / GitHub doc links (defaults to main). */
  branch: string;
  demo?: DemoConfig;
  contentStatus: ContentStatus;
  contentMessage?: string;
  diagram: ProjectDiagramData;
} & Omit<PortfolioYaml | PlaceholderContent, "diagram">;

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function githubUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

function placeholderSummary(status: ContentStatus): string {
  switch (status) {
    case "missing_yaml":
      return "portfolio.yaml not configured";
    case "invalid_yaml":
      return "invalid portfolio.yaml";
    case "fetch_error":
      return "could not fetch portfolio.yaml";
    default:
      return "content unavailable";
  }
}

function placeholderDescription(status: ContentStatus, repo: string, message?: string): string {
  const repoLink = githubUrl(repo);
  switch (status) {
    case "missing_yaml":
      return `Visitor-facing content for this project has not been set up yet. Add a portfolio.yaml to the repository root and rebuild the portfolio. Repository: ${repoLink}`;
    case "invalid_yaml":
      return `The portfolio.yaml in this repository failed validation${message ? `: ${message}` : ""}. Fix the file and rebuild. Repository: ${repoLink}`;
    case "fetch_error":
      return `Could not fetch portfolio.yaml from GitHub${message ? `: ${message}` : ""}. Check network access and GITHUB_TOKEN for private repos. Repository: ${repoLink}`;
    default:
      return `Content unavailable. Repository: ${repoLink}`;
  }
}

function buildPlaceholder(entry: RegistryEntry, status: ContentStatus, message?: string): Project {
  return {
    slug: entry.slug,
    repo: entry.repo,
    branch: entry.branch ?? "main",
    demo: entry.demo,
    contentStatus: status,
    contentMessage: message,
    diagram: attachLocalGraphIfMissing(BASE_DIAGRAM, entry.slug),
    title: humanizeSlug(entry.slug),
    summary: placeholderSummary(status),
    description: placeholderDescription(status, entry.repo, message),
    stack: [],
    status: "wip",
    links: {
      github: githubUrl(entry.repo),
    },
  };
}

export function mergeProject(
  entry: RegistryEntry,
  yaml: PortfolioYaml,
  contentStatus: ContentStatus = "ok",
  contentMessage?: string,
  diagram: ProjectDiagramData = BASE_DIAGRAM,
): Project {
  const content: Omit<PortfolioYaml, "diagram"> = {
    title: yaml.title,
    summary: yaml.summary,
    description: yaml.description,
    stack: yaml.stack,
    status: yaml.status,
    links: yaml.links,
    ...(yaml.slug !== undefined ? { slug: yaml.slug } : {}),
  };
  return {
    ...content,
    slug: entry.slug,
    repo: entry.repo,
    branch: entry.branch ?? "main",
    demo: entry.demo,
    contentStatus,
    contentMessage,
    diagram: attachLocalGraphIfMissing(
      {
        ...diagram,
        ...(yaml.walkthrough && yaml.walkthrough.length > 0
          ? { walkthrough: yaml.walkthrough }
          : {}),
      },
      entry.slug,
    ),
  };
}

function shouldUseMockFallback(): boolean {
  return process.env.PORTFOLIO_FETCH_SKIP === "true";
}

function getFetchResultsBySlug(): Map<string, FetchResult> | null {
  if (shouldUseMockFallback()) {
    return null;
  }

  try {
    const file = fetchedProjects as FetchedProjectsFile;
    if (!file?.results?.length) {
      return null;
    }
    return new Map(file.results.map((r) => [r.slug, r]));
  } catch {
    return null;
  }
}

function buildFromFetchResult(entry: RegistryEntry, result: FetchResult): Project {
  if (result.status === "ok") {
    return mergeProject(entry, result.yaml, "ok", undefined, result.diagram ?? BASE_DIAGRAM);
  }
  return buildPlaceholder(entry, result.status, result.message);
}

function buildFromMock(entry: RegistryEntry): Project | null {
  const yaml = mockProjects[entry.slug];
  if (!yaml) return null;
  return mergeProject(entry, yaml);
}

function buildProject(entry: RegistryEntry, fetchBySlug: Map<string, FetchResult> | null): Project {
  if (fetchBySlug) {
    const result = fetchBySlug.get(entry.slug);
    if (result) {
      return buildFromFetchResult(entry, result);
    }
    return buildPlaceholder(entry, "missing_yaml", `No fetch result for slug "${entry.slug}"`);
  }

  const mock = buildFromMock(entry);
  if (mock) {
    return mock;
  }

  return buildPlaceholder(entry, "missing_yaml", "No mock data available");
}

export function getAllProjects(): Project[] {
  const fetchBySlug = getFetchResultsBySlug();
  return registry.map((entry) => buildProject(entry, fetchBySlug));
}

export function getFeaturedProjects(): Project[] {
  return getAllProjects().filter((p) => p.demo?.type === "iframe");
}

export function getProjectBySlug(slug: string): Project | undefined {
  const entry = registry.find((e) => e.slug === slug);
  if (!entry) return undefined;

  const fetchBySlug = getFetchResultsBySlug();
  return buildProject(entry, fetchBySlug);
}

export function getAllSlugs(): string[] {
  return registry.map((entry) => entry.slug);
}

export function contentNoticeHeading(status: ContentStatus): string {
  switch (status) {
    case "missing_yaml":
      return "portfolio.yaml not configured";
    case "invalid_yaml":
      return "invalid portfolio.yaml";
    case "fetch_error":
      return "could not fetch portfolio.yaml";
    default:
      return "content unavailable";
  }
}
