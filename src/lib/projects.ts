import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { getProfile } from "@/lib/profile";
import { type Project, SLUG_PATTERN, validateProjectSet } from "@/lib/portfolio-schema";
import { parseProjectFile } from "@/lib/project-file";

const ROOT = process.cwd();
export const PROJECTS_DIR = resolve(ROOT, "content/projects");

function loadProject(fileName: string): Project {
  const slug = basename(fileName, ".md");
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`content/projects/${fileName}: file name must be lowercase letters, digits or dashes`);
  }

  const path = resolve(PROJECTS_DIR, fileName);
  const result = parseProjectFile(slug, readFileSync(path, "utf8"));
  if (!result.ok) {
    throw new Error(`Invalid ${path}: ${result.message}`);
  }

  const project = result.project;
  if (project.face && !existsSync(resolve(ROOT, "public", `.${project.face}`))) {
    throw new Error(`${slug}: face image not found at public${project.face}`);
  }
  return project;
}

let cached: Project[] | undefined;

/** Every content/projects/*.md, validated alone and as a set, sorted by tier then order. Throws on any problem. */
export function getProjects(): Project[] {
  if (cached) return cached;

  const fileNames = readdirSync(PROJECTS_DIR).filter((name) => name.endsWith(".md"));
  if (fileNames.length === 0) {
    throw new Error(`No project files in ${PROJECTS_DIR}`);
  }

  const projects = fileNames.map(loadProject);
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
