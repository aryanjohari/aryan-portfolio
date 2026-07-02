export type ProjectStatus = "active" | "wip" | "archived";

export type PortfolioLinks = {
  github: string;
  demo?: string;
  docs?: string;
};

export type PortfolioYaml = {
  title: string;
  slug?: string;
  summary: string;
  description: string;
  stack: string[];
  status: ProjectStatus;
  links: PortfolioLinks;
};

export type ContentStatus = "ok" | "missing_yaml" | "invalid_yaml" | "fetch_error";

export type FetchResult =
  | { slug: string; status: "ok"; yaml: PortfolioYaml; fetchedAt: string }
  | { slug: string; status: "missing_yaml"; repo: string; message: string }
  | { slug: string; status: "invalid_yaml"; repo: string; message: string; raw?: string }
  | { slug: string; status: "fetch_error"; repo: string; message: string };

export type FetchedProjectsFile = {
  fetchedAt: string;
  results: FetchResult[];
};

const PROJECT_STATUSES: ProjectStatus[] = ["active", "wip", "archived"];
const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export function validatePortfolioYaml(data: unknown): { ok: true; yaml: PortfolioYaml } | { ok: false; message: string } {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: "Expected a YAML object at root" };
  }

  const record = data as Record<string, unknown>;

  if (!isNonEmptyString(record.title)) {
    return { ok: false, message: "Missing or empty required field: title" };
  }

  if (record.slug !== undefined && !isNonEmptyString(record.slug)) {
    return { ok: false, message: "Field slug must be a non-empty string when provided" };
  }

  if (!isNonEmptyString(record.summary)) {
    return { ok: false, message: "Missing or empty required field: summary" };
  }

  if (!isNonEmptyString(record.description)) {
    return { ok: false, message: "Missing or empty required field: description" };
  }

  if (!isStringArray(record.stack)) {
    return { ok: false, message: "Field stack must be a non-empty array of strings" };
  }

  if (!isNonEmptyString(record.status) || !PROJECT_STATUSES.includes(record.status as ProjectStatus)) {
    return { ok: false, message: `Field status must be one of: ${PROJECT_STATUSES.join(", ")}` };
  }

  if (record.links === null || typeof record.links !== "object" || Array.isArray(record.links)) {
    return { ok: false, message: "Missing or invalid required field: links" };
  }

  const links = record.links as Record<string, unknown>;

  if (!isNonEmptyString(links.github) || !GITHUB_URL_PATTERN.test(links.github.trim())) {
    return { ok: false, message: "links.github must be a valid GitHub repository URL" };
  }

  if (links.demo !== undefined && !isNonEmptyString(links.demo)) {
    return { ok: false, message: "links.demo must be a non-empty string when provided" };
  }

  if (links.docs !== undefined && !isNonEmptyString(links.docs)) {
    return { ok: false, message: "links.docs must be a non-empty string when provided" };
  }

  const yaml: PortfolioYaml = {
    title: record.title.trim(),
    summary: record.summary.trim(),
    description: record.description.trim(),
    stack: record.stack.map((s) => s.trim()),
    status: record.status as ProjectStatus,
    links: {
      github: links.github.trim(),
      ...(links.demo !== undefined ? { demo: (links.demo as string).trim() } : {}),
      ...(links.docs !== undefined ? { docs: (links.docs as string).trim() } : {}),
    },
  };

  if (record.slug !== undefined) {
    yaml.slug = record.slug.trim();
  }

  return { ok: true, yaml };
}
