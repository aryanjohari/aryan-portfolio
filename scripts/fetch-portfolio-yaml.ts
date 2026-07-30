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
  ProjectC4Data,
  ProjectC4Doc,
  ProjectC4DiveTarget,
  ProjectDiagramData,
} from "../src/lib/portfolio-schema";
import { validatePortfolioYaml } from "../src/lib/portfolio-schema";
import type { ArchitectureGraph } from "../src/lib/architecture-graph";
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
const C4_MAP_PATH = "docs/c4/portfolio-map.json";
const C4_COMPONENTS_DIR = "docs/c4/3-components";
const MERMAID_MAX_CHARS = 48_000;

const MERMAID_FENCE_RE = /```mermaid\s*\n([\s\S]*?)```/i;

/**
 * Known dive-id → overview graph node aliases while project maps catch up.
 * Prefer fixing portfolio-map.json in source repos over growing this table.
 */
const DIVE_ID_ALIASES: Record<string, string[]> = {
  "studio-spa": ["spa", "studio-spa"],
  "mood-api": ["mood-api"],
  "pii-gateway": [
    "pii-gateway",
    "sanitize-api",
    "batch-jobs",
    "sanitize-pipeline",
    "presidio",
    "policy",
  ],
};

const DIVE_LABEL_OVERRIDES: Record<string, string> = {
  "studio-spa": "Studio SPA",
  "mood-api": "Mood API",
  "vj-scene": "VJ scene",
  "audio-engine": "Audio engine",
  "pii-gateway": "PII Gateway",
};

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

type GitHubDirEntry = {
  name: string;
  type?: string;
  path?: string;
};

async function listRepoDir(
  repo: string,
  branch: string,
  path: string,
  token: string | undefined,
): Promise<GitHubDirEntry[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "aryan-portfolio-fetch",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(apiUrl(repo, branch, path), { headers });
  if (!response.ok) return [];
  const body = (await response.json()) as unknown;
  return Array.isArray(body) ? (body as GitHubDirEntry[]) : [];
}

function humanizeDiveId(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function clampMermaid(slug: string, path: string, text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MERMAID_MAX_CHARS) {
    console.warn(
      `  [${slug}] mermaid at ${path} exceeds ${MERMAID_MAX_CHARS} chars — skipped`,
    );
    return undefined;
  }
  return trimmed;
}

async function fetchC4DocPair(
  slug: string,
  repo: string,
  branch: string,
  token: string | undefined,
  basePathWithoutExt: string,
): Promise<ProjectC4Doc | undefined> {
  const mmdPath = `${basePathWithoutExt}.mmd`;
  const mdPath = `${basePathWithoutExt}.md`;
  const [mmdFile, mdFile] = await Promise.all([
    fetchRepoFile(repo, branch, mmdPath, token),
    fetchRepoFile(repo, branch, mdPath, token),
  ]);

  const doc: ProjectC4Doc = {};
  if (mmdFile.ok) {
    const mermaid = clampMermaid(slug, mmdPath, mmdFile.text);
    if (mermaid) {
      doc.mermaid = mermaid;
      doc.path = mmdPath;
    }
  }
  if (mdFile.ok) {
    const markdown = mdFile.text.trim();
    if (markdown) {
      doc.markdown = markdown;
      if (!doc.path) doc.path = mdPath;
    }
  }
  return doc.mermaid || doc.markdown ? doc : undefined;
}

function extractDiveIdsFromMap(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
  const record = raw as Record<string, unknown>;
  const ids = new Set<string>();

  const takeStringArray = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      if (typeof item === "string" && item.trim()) ids.add(item.trim());
    }
  };

  takeStringArray(record.componentDiagrams);
  takeStringArray(record.containersWithComponents);
  takeStringArray(record.containerIdsWithComponents);

  const c4 = record.c4;
  if (c4 && typeof c4 === "object" && !Array.isArray(c4)) {
    const c4Rec = c4 as Record<string, unknown>;
    takeStringArray(c4Rec.componentDiagrams);
    takeStringArray(c4Rec.containersWithComponents);
    takeStringArray(c4Rec.containerIdsWithComponents);
  }

  if (Array.isArray(record.diveTargets)) {
    for (const item of record.diveTargets) {
      if (typeof item === "string" && item.trim()) ids.add(item.trim());
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const id = (item as Record<string, unknown>).id;
        if (typeof id === "string" && id.trim()) ids.add(id.trim());
      }
    }
  }

  return [...ids];
}

function resolveGraphNodeIdsForDive(
  diveId: string,
  graphNodeIds: Set<string>,
  mapEntry?: { graphNodeIds?: unknown },
): string[] {
  if (mapEntry && Array.isArray(mapEntry.graphNodeIds)) {
    const explicit = mapEntry.graphNodeIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    if (explicit.length > 0) {
      return explicit.filter((id) => graphNodeIds.has(id));
    }
  }

  const candidates = DIVE_ID_ALIASES[diveId] ?? [diveId];
  return candidates.filter((id) => graphNodeIds.has(id));
}

/**
 * Resolve optional C4 artifacts for Dive. Fail soft — missing C4 never breaks a project.
 */
async function resolveC4(
  slug: string,
  repo: string,
  branch: string,
  token: string | undefined,
  graph: ArchitectureGraph | undefined,
): Promise<ProjectC4Data | undefined> {
  const graphNodeIds = new Set(graph?.nodes.map((n) => n.id) ?? []);

  let mapPath: string | undefined;
  let diveIds: string[] = [];
  const mapDiveMeta = new Map<string, { label?: string; graphNodeIds?: unknown }>();

  const mapFile = await fetchRepoFile(repo, branch, C4_MAP_PATH, token);
  if (mapFile.ok) {
    try {
      const parsed = JSON.parse(mapFile.text) as unknown;
      mapPath = C4_MAP_PATH;
      diveIds = extractDiveIdsFromMap(parsed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const diveTargets = (parsed as Record<string, unknown>).diveTargets;
        if (Array.isArray(diveTargets)) {
          for (const item of diveTargets) {
            if (item && typeof item === "object" && !Array.isArray(item)) {
              const rec = item as Record<string, unknown>;
              if (typeof rec.id === "string" && rec.id.trim()) {
                mapDiveMeta.set(rec.id.trim(), {
                  label: typeof rec.label === "string" ? rec.label : undefined,
                  graphNodeIds: rec.graphNodeIds,
                });
              }
            }
          }
        }
      }
    } catch {
      console.warn(`  [${slug}] invalid C4 portfolio-map.json — ignoring map`);
    }
  }

  if (diveIds.length === 0) {
    const entries = await listRepoDir(repo, branch, C4_COMPONENTS_DIR, token);
    for (const entry of entries) {
      if (entry.type && entry.type !== "file") continue;
      const name = entry.name;
      if (name.endsWith(".mmd")) {
        diveIds.push(name.slice(0, -4));
      } else if (name.endsWith(".md")) {
        const stem = name.slice(0, -3);
        if (!entries.some((e) => e.name === `${stem}.mmd`)) {
          diveIds.push(stem);
        }
      }
    }
  }

  diveIds = [...new Set(diveIds)];

  const [context, containers] = await Promise.all([
    fetchC4DocPair(slug, repo, branch, token, "docs/c4/1-context"),
    fetchC4DocPair(slug, repo, branch, token, "docs/c4/2-containers"),
  ]);

  const components: Record<string, ProjectC4Doc> = {};
  const diveTargets: ProjectC4DiveTarget[] = [];

  for (const id of diveIds) {
    const doc = await fetchC4DocPair(
      slug,
      repo,
      branch,
      token,
      `${C4_COMPONENTS_DIR}/${id}`,
    );
    if (doc) components[id] = doc;

    const meta = mapDiveMeta.get(id);
    const nodeIds = resolveGraphNodeIdsForDive(id, graphNodeIds, meta);
    diveTargets.push({
      id,
      label: meta?.label?.trim() || DIVE_LABEL_OVERRIDES[id] || humanizeDiveId(id),
      graphNodeIds: nodeIds,
    });
  }

  const filteredTargets = diveTargets.filter((t) => components[t.id] || mapPath);

  if (
    !context &&
    !containers &&
    Object.keys(components).length === 0 &&
    filteredTargets.length === 0
  ) {
    return undefined;
  }

  return {
    ...(mapPath ? { mapPath } : {}),
    ...(context ? { context } : {}),
    ...(containers ? { containers } : {}),
    components,
    diveTargets: filteredTargets,
  };
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

      const c4 = await resolveC4(slug, repo, branch, token, graphFields.graph);
      if (c4 && c4.diveTargets.length > 0) {
        console.log(
          `  ${slug.padEnd(20)} c4     ← ${c4.diveTargets.length} dive target(s)`,
        );
      } else if (c4) {
        console.log(`  ${slug.padEnd(20)} c4     ← docs (no dive targets)`);
      } else {
        console.log(`  ${slug.padEnd(20)} c4     ← (none)`);
      }

      return {
        ...result,
        diagram: {
          ...diagram,
          ...graphFields,
          ...(c4 ? { c4 } : {}),
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
      const c4Count = result.diagram?.c4?.diveTargets.length ?? 0;
      const c4Note = c4Count > 0 ? `c4:${c4Count}` : "c4:none";
      return `validated (${result.yaml.stack.length} stack items, ${diagramNote}, ${graphNote}, ${c4Note})`;
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
