import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

import { parse } from "yaml";

import { getProfile } from "@/lib/profile";
import {
  type Project,
  type ProjectIndexEntry,
  validateProject,
  validateProjectIndex,
  validateProjectSet,
} from "@/lib/portfolio-schema";

const ROOT = process.cwd();
export const PROJECT_INDEX_PATH = resolve(ROOT, "content/projects.yaml");
/** scripts/fetch-projects.ts writes repo projects here; gitignored. */
export const FETCH_CACHE_DIR = resolve(ROOT, ".cache/projects");
export const FETCHED_PUBLIC_DIR = resolve(ROOT, "public/fetched");

export function readProjectIndex(): ProjectIndexEntry[] {
  const result = validateProjectIndex(parse(readFileSync(PROJECT_INDEX_PATH, "utf8")));
  if (!result.ok) {
    throw new Error(`Invalid ${PROJECT_INDEX_PATH}: ${result.message}`);
  }
  return result.entries;
}

/** Site path a fetched face image is saved under, keeping the source file's extension. */
export function fetchedFacePath(slug: string, repoFacePath: string): string {
  return `/fetched/${slug}/face${extname(repoFacePath).toLowerCase()}`;
}

function yamlPathFor(entry: ProjectIndexEntry): string {
  return entry.repo
    ? resolve(FETCH_CACHE_DIR, `${entry.slug}.yaml`)
    : resolve(ROOT, "content/projects", `${entry.slug}.yaml`);
}

function loadProject(entry: ProjectIndexEntry): Project {
  const path = yamlPathFor(entry);
  if (!existsSync(path)) {
    const hint = entry.repo ? " (run npm run fetch:projects)" : "";
    throw new Error(`Missing project file for ${entry.slug}: ${path}${hint}`);
  }

  const result = validateProject(entry.slug, parse(readFileSync(path, "utf8")));
  if (!result.ok) {
    throw new Error(`Invalid ${path}: ${result.message}`);
  }

  const project = result.project;
  if (project.face) {
    // Repo projects name a path in their repo; local ones name a site path under public/.
    const sitePath = entry.repo ? fetchedFacePath(entry.slug, project.face) : project.face;
    if (!existsSync(resolve(ROOT, "public", `.${sitePath}`))) {
      throw new Error(`${entry.slug}: face image not found at public${sitePath}`);
    }
    project.face = sitePath;
  }
  return project;
}

let cached: Project[] | undefined;

/** Every project, validated alone and as a set, sorted by tier then order. Throws on any problem. */
export function getProjects(): Project[] {
  if (cached) return cached;

  const projects = readProjectIndex().map(loadProject);
  const threadIds = getProfile().threads.map((thread) => thread.id);
  const setResult = validateProjectSet(projects, threadIds);
  if (!setResult.ok) {
    throw new Error(`Invalid project set: ${setResult.message}`);
  }

  const tierRank = { featured: 0, "in-progress": 1, archive: 2 };
  cached = projects.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.order - b.order);
  return cached;
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((project) => project.slug === slug);
}
