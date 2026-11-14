import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

export function readProjectIndex(): ProjectIndexEntry[] {
  const result = validateProjectIndex(parse(readFileSync(PROJECT_INDEX_PATH, "utf8")));
  if (!result.ok) {
    throw new Error(`Invalid ${PROJECT_INDEX_PATH}: ${result.message}`);
  }
  return result.entries;
}

function loadProject(entry: ProjectIndexEntry): Project {
  const path = resolve(ROOT, "content/projects", `${entry.slug}.yaml`);
  if (!existsSync(path)) {
    throw new Error(`Missing project file for ${entry.slug}: ${path}`);
  }

  const result = validateProject(entry.slug, parse(readFileSync(path, "utf8")));
  if (!result.ok) {
    throw new Error(`Invalid ${path}: ${result.message}`);
  }

  const project = result.project;
  if (project.face && !existsSync(resolve(ROOT, "public", `.${project.face}`))) {
    throw new Error(`${entry.slug}: face image not found at public${project.face}`);
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
