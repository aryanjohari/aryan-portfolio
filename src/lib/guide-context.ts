/**
 * Builds the AI guide's context from the public site content only (profile.yaml
 * and the project files). Nothing else goes in: whatever is in the context, a
 * visitor can get the model to repeat. Pure: file reads live in the caller.
 */

import type { Project } from "./portfolio-schema";
import type { Profile } from "./profile-schema";
import { DEFAULT_SUGGESTED_CHIPS, type GuideContextFile } from "./guide-schema";

export function buildGuideContext(profile: Profile, projects: Project[], builtAt: string): GuideContextFile {
  const identity = [
    `# ${profile.name}`,
    profile.headline,
    profile.tagline,
    profile.pitch.trim(),
    `Location: ${profile.location}`,
    `Work rights: ${profile.work_rights}`,
    `Email: ${profile.links.email} · GitHub: ${profile.links.github} · LinkedIn: ${profile.links.linkedin}`,
    `Certifications: ${profile.certifications.join(", ")}`,
  ].join("\n\n");

  const contextProjects = projects.map((project) => ({
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.story ? `${project.story.problem} ${project.story.built}` : project.summary,
    stack: project.stack,
    demo: project.links.demo !== undefined,
  }));

  const context: GuideContextFile = {
    builtAt,
    identity,
    resumeText: profile.pitch.trim(),
    experience: profile.experience.map((job) => ({
      role: job.role,
      company: job.org,
      location: job.org_note,
      period: job.dates,
      highlights: job.highlights,
    })),
    education: profile.education.map((school) => ({
      degree: school.degree,
      institution: school.school,
      period: school.dates,
      notes: school.note,
    })),
    meta: {
      projectCount: projects.length,
      featuredDemoSlugs: projects.filter((p) => p.tier === "featured" && p.links.demo).map((p) => p.slug),
      contextCharCount: 0,
    },
    projects: contextProjects,
    suggestedChips: DEFAULT_SUGGESTED_CHIPS,
  };
  context.meta.contextCharCount = JSON.stringify(context).length;
  return context;
}
