import type { DemoConfig, RegistryEntry } from "@/data/registry";
import { registry } from "@/data/registry";
import { mockProjects } from "@/lib/mock-projects";

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

export type Project = PortfolioYaml & {
  slug: string;
  repo: string;
  demo?: DemoConfig;
};

export type { DemoConfig };

export function mergeProject(entry: RegistryEntry, yaml: PortfolioYaml): Project {
  return {
    ...yaml,
    slug: entry.slug,
    repo: entry.repo,
    demo: entry.demo,
  };
}

export function getAllProjects(): Project[] {
  return registry
    .map((entry) => {
      const yaml = mockProjects[entry.slug];
      if (!yaml) return null;
      return mergeProject(entry, yaml);
    })
    .filter((project): project is Project => project !== null);
}

export function getProjectBySlug(slug: string): Project | undefined {
  const entry = registry.find((e) => e.slug === slug);
  if (!entry) return undefined;

  const yaml = mockProjects[entry.slug];
  if (!yaml) return undefined;

  return mergeProject(entry, yaml);
}

export function getAllSlugs(): string[] {
  return registry.map((entry) => entry.slug);
}
