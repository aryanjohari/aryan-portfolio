import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoryPage } from "@/components/StoryPage";
import { getProfile } from "@/lib/profile";
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = getProject((await params).slug);
  if (!project?.story) {
    notFound();
  }
  return <StoryPage project={project} />;
}
