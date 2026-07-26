#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

import { registry } from "../src/data/registry";
import { getLocalArchitectureGraph } from "../src/data/architecture-graphs";
import type {
  FetchResult,
  FetchedProjectsFile,
  PortfolioYaml,
  ProjectDiagramData,
} from "../src/lib/portfolio-schema";
import { validatePortfolioYaml } from "../src/lib/portfolio-schema";
import { validateArchitectureGraph } from "../src/lib/architecture-graph";

const OUTPUT_PATH = resolve(process.cwd(), "src/lib/fetched-projects.json");
const DEFAULT_BRANCH = "main";

const DIAGRAM_DIRECT_FALLBACKS = ["docs/architecture.mmd", "docs/architecture.mermaid"] as const;
const DIAGRAM_MARKDOWN_FALLBACKS = [
  "docs/ARCHITECTURE.md",
  "PROJECT.md",
  "docs/architecture.md",
] as const;
const GRAPH_FALLBACKS = ["docs/architecture.graph.json"] as const;

const MERMAID_FENCE_RE = /```mermaid\s*\n([\s\S]*?)```/i;

function loadEnvFile(filename: string): void {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function rawUrl(repo: string, branch: string, path: string): string {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

function apiUrl(repo: string, branch: string, path: string): string {
  return `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
}

async function fetchRaw(
  repo: string,
  branch: string,
  path: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const response = await fetch(rawUrl(repo, branch, path), {
    headers: { "User-Agent": "aryan-portfolio-fetch" },
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return { ok: true, text: await response.text() };
}

type GitHubContentResponse = {
  content?: string;
  encoding?: string;
  message?: string;
};

async function fetchViaApi(
  repo: string,
  branch: string,
  path: string,
  token: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const response = await fetch(apiUrl(repo, branch, path), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "aryan-portfolio-fetch",
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore parse errors
    }
    return { ok: false, status: response.status, message };
  }

  const body = (await response.json()) as GitHubContentResponse;

  if (!body.content || body.encoding !== "base64") {
    return { ok: false, status: 500, message: "Unexpected GitHub API response shape" };
  }

  const text = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { ok: true, text };
}

/** Fetch a repo file via raw URL, falling back to Contents API when needed. */
async function fetchRepoFile(
  repo: string,
  branch: string,
  path: string,
  token: string | undefined,
): Promise<{ ok: true; text: string } | { ok: false }> {
  const rawResult = await fetchRaw(repo, branch, path);

  if (rawResult.ok) {
    return { ok: true, text: rawResult.text };
  }

  const shouldTryApi = rawResult.status === 404 || rawResult.status === 401 || rawResult.status === 403;
  if (!shouldTryApi || !token) {
    return { ok: false };
  }

  const apiResult = await fetchViaApi(repo, branch, path, token);
  if (apiResult.ok) {
    return { ok: true, text: apiResult.text };
  }

  return { ok: false };
}

function extractMermaidFromMarkdown(text: string): string | null {
  const match = text.match(MERMAID_FENCE_RE);
  if (!match?.[1]) return null;
  const body = match[1].trim();
  return body.length > 0 ? body : null;
}

function isDirectMermaidPath(path: string): boolean {
  return /\.(mmd|mermaid)$/i.test(path);
}

async function resolveDiagram(
  repo: string,
  branch: string,
  yaml: PortfolioYaml,
  token: string | undefined,
): Promise<ProjectDiagramData> {
  const candidates: { path: string; mode: "direct" | "markdown" }[] = [];

  if (yaml.diagram) {
    candidates.push({
      path: yaml.diagram,
      mode: isDirectMermaidPath(yaml.diagram) ? "direct" : "markdown",
    });
  }

  for (const path of DIAGRAM_DIRECT_FALLBACKS) {
    candidates.push({ path, mode: "direct" });
  }
  for (const path of DIAGRAM_MARKDOWN_FALLBACKS) {
    candidates.push({ path, mode: "markdown" });
  }

  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate.path)) continue;
    seen.add(candidate.path);

    const file = await fetchRepoFile(repo, branch, candidate.path, token);
    if (!file.ok) continue;

    if (candidate.mode === "direct") {
      const mermaid = file.text.trim();
      if (!mermaid) continue;
      return { source: "github", path: candidate.path, mermaid };
    }

    const mermaid = extractMermaidFromMarkdown(file.text);
    if (!mermaid) continue;
    return { source: "github", path: candidate.path, mermaid };
  }

  return { source: "base" };
}

/**
 * Resolve owned architecture graph IR.
 * Prefer repo `graph:` / docs/architecture.graph.json; fall back to portfolio fixtures.
 */
async function resolveGraph(
  slug: string,
  repo: string,
  branch: string,
  yaml: PortfolioYaml,
  token: string | undefined,
): Promise<Pick<ProjectDiagramData, "graph" | "graphSource" | "graphPath">> {
  const candidates: string[] = [];
  if (yaml.graph) candidates.push(yaml.graph);
  for (const path of GRAPH_FALLBACKS) candidates.push(path);

  const seen = new Set<string>();
  for (const path of candidates) {
    if (seen.has(path)) continue;
    seen.add(path);

    const file = await fetchRepoFile(repo, branch, path, token);
    if (!file.ok) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      console.warn(`  [${slug}] graph JSON parse failed at ${path}`);
      continue;
    }

    const validation = validateArchitectureGraph(parsed);
    if (!validation.ok) {
      const detail = validation.issues.map((i) => i.message).join("; ");
      console.warn(`  [${slug}] invalid graph at ${path}: ${detail}`);
      continue;
    }

    for (const w of validation.warnings) {
      console.warn(`  [${slug}] graph warning (${path}): ${w.message}`);
    }

    return {
      graph: validation.graph,
      graphSource: "github",
      graphPath: path,
    };
  }

  const local = getLocalArchitectureGraph(slug);
  if (local) {
    return {
      graph: local,
      graphSource: "local",
      graphPath: `src/data/architecture-graphs/${slug}.graph.json`,
    };
  }

  return {};
}

function parseAndValidate(raw: string, slug: string, repo: string): FetchResult {
  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "YAML parse error";
    console.warn(`  [${slug}] invalid_yaml: ${message}`);
    return {
      slug,
      status: "invalid_yaml",
      repo,
      message: `YAML parse error: ${message}`,
      raw: raw.slice(0, 500),
    };
  }

  const validation = validatePortfolioYaml(parsed);
  if (!validation.ok) {
    console.warn(`  [${slug}] invalid_yaml: ${validation.message}`);
    return {
      slug,
      status: "invalid_yaml",
      repo,
      message: validation.message,
      raw: raw.slice(0, 500),
    };
  }

  return {
    slug,
    status: "ok",
    yaml: validation.yaml,
    fetchedAt: new Date().toISOString(),
    diagram: { source: "base" },
  };
}

async function fetchEntry(
  slug: string,
  repo: string,
  branch: string,
  token: string | undefined,
): Promise<FetchResult> {
  try {
    const rawResult = await fetchRaw(repo, branch, "portfolio.yaml");

    let yamlText: string | null = null;

    if (rawResult.ok) {
      console.log(`  ${slug.padEnd(20)} raw OK`);
      yamlText = rawResult.text;
    } else {
      const shouldTryApi =
        rawResult.status === 404 || rawResult.status === 401 || rawResult.status === 403;

      if (!shouldTryApi) {
        console.error(`  ${slug.padEnd(20)} raw ${rawResult.status} → fetch_error`);
        return {
          slug,
          status: "fetch_error",
          repo,
          message: `Raw fetch failed with HTTP ${rawResult.status}`,
        };
      }

      if (!token) {
        if (rawResult.status === 404) {
          console.log(`  ${slug.padEnd(20)} raw 404 → missing_yaml (no token for API)`);
          return {
            slug,
            status: "missing_yaml",
            repo,
            message: `portfolio.yaml not found on branch "${branch}"`,
          };
        }
        console.error(`  ${slug.padEnd(20)} raw ${rawResult.status} → fetch_error (no token)`);
        return {
          slug,
          status: "fetch_error",
          repo,
          message: `HTTP ${rawResult.status} on raw URL; GITHUB_TOKEN required for private repos`,
        };
      }

      const apiResult = await fetchViaApi(repo, branch, "portfolio.yaml", token);

      if (apiResult.ok) {
        console.log(`  ${slug.padEnd(20)} raw ${rawResult.status} → API OK`);
        yamlText = apiResult.text;
      } else if (apiResult.status === 404) {
        console.log(`  ${slug.padEnd(20)} raw ${rawResult.status} → API 404 → missing_yaml`);
        return {
          slug,
          status: "missing_yaml",
          repo,
          message: `portfolio.yaml not found on branch "${branch}"`,
        };
      } else {
        console.error(`  ${slug.padEnd(20)} API ${apiResult.status} → fetch_error: ${apiResult.message}`);
        return {
          slug,
          status: "fetch_error",
          repo,
          message: `GitHub API error (${apiResult.status}): ${apiResult.message}`,
        };
      }
    }

    const result = parseAndValidate(yamlText!, slug, repo);
    if (result.status !== "ok") {
      return result;
    }

    try {
      const diagram = await resolveDiagram(repo, branch, result.yaml, token);
      if (diagram.source === "github") {
        console.log(`  ${slug.padEnd(20)} diagram ← ${diagram.path}`);
      } else {
        console.log(`  ${slug.padEnd(20)} diagram ← base template`);
      }

      const graphFields = await resolveGraph(slug, repo, branch, result.yaml, token);
      if (graphFields.graphSource === "github") {
        console.log(`  ${slug.padEnd(20)} graph   ← ${graphFields.graphPath}`);
      } else if (graphFields.graphSource === "local") {
        console.log(`  ${slug.padEnd(20)} graph   ← local fixture`);
      } else {
        console.log(`  ${slug.padEnd(20)} graph   ← (none)`);
      }

      return {
        ...result,
        diagram: {
          ...diagram,
          ...graphFields,
          ...(result.yaml.walkthrough && result.yaml.walkthrough.length > 0
            ? { walkthrough: result.yaml.walkthrough }
            : {}),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "diagram resolve error";
      console.warn(`  [${slug}] diagram fallback to base: ${message}`);
      const local = getLocalArchitectureGraph(slug);
      return {
        ...result,
        diagram: {
          source: "base",
          ...(local
            ? {
                graph: local,
                graphSource: "local" as const,
                graphPath: `src/data/architecture-graphs/${slug}.graph.json`,
              }
            : {}),
          ...(result.yaml.walkthrough && result.yaml.walkthrough.length > 0
            ? { walkthrough: result.yaml.walkthrough }
            : {}),
        },
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fetch error";
    console.error(`  ${slug.padEnd(20)} fetch_error: ${message}`);
    return {
      slug,
      status: "fetch_error",
      repo,
      message,
    };
  }
}

function statusNotes(result: FetchResult): string {
  switch (result.status) {
    case "ok": {
      const diagramNote =
        result.diagram?.source === "github"
          ? `diagram:${result.diagram.path ?? "github"}`
          : "diagram:base";
      const graphNote = result.diagram?.graph
        ? `graph:${result.diagram.graphSource ?? "yes"}`
        : "graph:none";
      return `validated (${result.yaml.stack.length} stack items, ${diagramNote}, ${graphNote})`;
    }
    case "missing_yaml":
      return result.message;
    case "invalid_yaml":
      return result.message;
    case "fetch_error":
      return result.message;
  }
}

function printSummary(results: FetchResult[]): void {
  console.log("\nslug                 | status        | notes");
  console.log("---------------------|---------------|----------------------------------");
  for (const result of results) {
    const slug = result.slug.padEnd(20);
    const status = result.status.padEnd(13);
    console.log(`${slug} | ${status} | ${statusNotes(result)}`);
  }
}

async function main(): Promise<void> {
  if (process.env.PORTFOLIO_FETCH_SKIP === "true") {
    console.log("PORTFOLIO_FETCH_SKIP=true — skipping fetch, using existing data or mock fallback.");
    process.exit(0);
  }

  if (registry.length === 0) {
    console.error("Registry is empty — nothing to fetch.");
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN?.trim() || undefined;

  console.log(`Fetching portfolio.yaml for ${registry.length} registry entries…`);

  const results: FetchResult[] = [];

  for (const entry of registry) {
    const branch = entry.branch ?? DEFAULT_BRANCH;
    const result = await fetchEntry(entry.slug, entry.repo, branch, token);
    results.push(result);
  }

  printSummary(results);

  const output: FetchedProjectsFile = {
    fetchedAt: new Date().toISOString(),
    results,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const counts = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summaryParts = Object.entries(counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");

  console.log(`\nWrote ${OUTPUT_PATH} (${results.length} entries, ${summaryParts})`);
}

main().catch((err) => {
  console.error("Fetch script crashed:", err);
  process.exit(1);
});
