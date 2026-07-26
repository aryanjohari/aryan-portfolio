import type { ArchitectureGraph } from "@/lib/architecture-graph";

export type ProjectStatus = "active" | "wip" | "archived";

export type PortfolioLinks = {
  github: string;
  demo?: string;
  docs?: string;
};

/** Optional authored architecture walkthrough step (visitor path story). */
export type PortfolioWalkthroughStep = {
  id?: string;
  title: string;
  body?: string;
  /** Match Mermaid node / cluster label for spotlight */
  highlight?: string;
  mermaidNodeId?: string;
};

export type PortfolioYaml = {
  title: string;
  slug?: string;
  summary: string;
  description: string;
  stack: string[];
  status: ProjectStatus;
  links: PortfolioLinks;
  /** Optional path hint to architecture Mermaid (e.g. docs/architecture.mmd). */
  diagram?: string;
  /**
   * Optional path hint to owned architecture graph IR
   * (e.g. docs/architecture.graph.json). Preferred over Mermaid on the site.
   */
  graph?: string;
  /** Optional 3–5 step path story; portfolio derives steps when omitted. */
  walkthrough?: PortfolioWalkthroughStep[];
};

export type ProjectDiagramData = {
  source: "github" | "base";
  path?: string;
  mermaid?: string;
  /**
   * Owned graph IR when fetched from the project repo or loaded from a
   * portfolio-local fixture. Site render should prefer this over `mermaid`.
   */
  graph?: ArchitectureGraph;
  /** Where `graph` came from when present. */
  graphSource?: "github" | "local";
  graphPath?: string;
  /** Normalized walkthrough from portfolio.yaml when authored */
  walkthrough?: PortfolioWalkthroughStep[];
};

export type ContentStatus = "ok" | "missing_yaml" | "invalid_yaml" | "fetch_error";

export type FetchResult =
  | {
      slug: string;
      status: "ok";
      yaml: PortfolioYaml;
      fetchedAt: string;
      diagram?: ProjectDiagramData;
    }
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

  if (record.diagram !== undefined && !isNonEmptyString(record.diagram)) {
    return { ok: false, message: "Field diagram must be a non-empty string when provided" };
  }

  if (record.graph !== undefined && !isNonEmptyString(record.graph)) {
    return { ok: false, message: "Field graph must be a non-empty string when provided" };
  }

  let walkthrough: PortfolioWalkthroughStep[] | undefined;
  if (record.walkthrough !== undefined) {
    if (!Array.isArray(record.walkthrough)) {
      return { ok: false, message: "Field walkthrough must be an array when provided" };
    }
    walkthrough = [];
    for (const item of record.walkthrough) {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return { ok: false, message: "Each walkthrough entry must be an object" };
      }
      const step = item as Record<string, unknown>;
      if (!isNonEmptyString(step.title)) {
        return { ok: false, message: "Each walkthrough entry needs a non-empty title" };
      }
      const entry: PortfolioWalkthroughStep = { title: step.title.trim() };
      if (step.id !== undefined) {
        if (!isNonEmptyString(step.id)) {
          return { ok: false, message: "walkthrough.id must be a non-empty string when provided" };
        }
        entry.id = step.id.trim();
      }
      if (step.body !== undefined) {
        if (!isNonEmptyString(step.body)) {
          return { ok: false, message: "walkthrough.body must be a non-empty string when provided" };
        }
        entry.body = step.body.trim();
      }
      if (step.highlight !== undefined) {
        if (!isNonEmptyString(step.highlight)) {
          return { ok: false, message: "walkthrough.highlight must be a non-empty string when provided" };
        }
        entry.highlight = step.highlight.trim();
      }
      if (step.mermaidNodeId !== undefined) {
        if (!isNonEmptyString(step.mermaidNodeId)) {
          return {
            ok: false,
            message: "walkthrough.mermaidNodeId must be a non-empty string when provided",
          };
        }
        entry.mermaidNodeId = step.mermaidNodeId.trim();
      }
      walkthrough.push(entry);
      if (walkthrough.length >= 5) break;
    }
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

  if (record.diagram !== undefined) {
    yaml.diagram = (record.diagram as string).trim();
  }

  if (record.graph !== undefined) {
    yaml.graph = (record.graph as string).trim();
  }

  if (walkthrough && walkthrough.length > 0) {
    yaml.walkthrough = walkthrough;
  }

  return { ok: true, yaml };
}
