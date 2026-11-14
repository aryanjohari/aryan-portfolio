import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectPage } from "@/components/ProjectPage";
import { getProfile } from "@/lib/profile";
import { nextProject } from "@/lib/project-display";
import { getProject, getProjects } from "@/lib/projects";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

/** Archive projects are one line on the home page, so only stories get pages. */
export function generateStaticParams() {
  return getProjects()
    .filter((project) => project.story)
    .map((project) => ({ slug: project.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = getProject((await params).slug);
  return project ? { title: `${project.title} · ${getProfile().name}`, description: project.summary } : {};
}

export default async function Page({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project?.story) {
    notFound();
  }
  const withPages = getProjects().filter((item) => item.story);
  const number = withPages.findIndex((item) => item.slug === slug) + 1;
  return <ProjectPage project={project} number={number} next={nextProject(getProjects(), slug)} />;
}
