/**
 * Splits the public site content into small sections the Ask box can search
 * and cite, e.g. "prism#decision". Only named public fields are copied, so
 * nothing else in profile.yaml can reach the model. Pure: the build script
 * passes in what the content loaders return.
 */

import { type Project, STORY_HEADINGS, STORY_PARTS } from "../portfolio-schema";
import type { Profile } from "../profile-schema";
import type { HomeText, StoryText } from "../site-text";

export type AskSection = {
  /** Stable id the model cites, e.g. "prism#decision". */
  id: string;
  /** Shown to the visitor as the source, e.g. "Prism · The key decision". */
  title: string;
  /** Site link for the source, e.g. "/projects/prism#story-decision". */
  url: string;
  text: string;
};

export type AskContent = { profile: Profile; projects: Project[]; home: HomeText; story: StoryText };

/** "Notepad, my uncle's PC" → "notepad-my-uncles-pc" */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function lines(...parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join("\n");
}

function profileSections(profile: Profile): AskSection[] {
  const { links } = profile;
  const about: AskSection = {
    id: "profile#about",
    title: "About Aryan",
    url: "/",
    text: lines(
      `${profile.name}: ${profile.headline}`,
      profile.tagline,
      profile.pitch.trim(),
      `Location: ${profile.location}`,
      `Work rights: ${profile.work_rights}`,
      `Certifications: ${profile.certifications.join(", ")}`,
      `Referees: ${profile.referees}`,
      `Email: ${links.email} · GitHub: ${links.github} · LinkedIn: ${links.linkedin} · CV: ${links.cv}`,
    ),
  };

  const jobs = profile.experience
    .filter((job) => job.hidden !== true)
    .map((job) => ({
      id: `profile#job-${slugify(job.org)}`,
      title: `${job.role} · ${job.org}`,
      url: "/#experience",
      text: lines(
        `${job.role} at ${job.org}${job.org_note ? ` (${job.org_note})` : ""}, ${job.dates}`,
        ...job.highlights,
        job.taught && `What it taught me: ${job.taught}`,
      ),
    }));

  const education: AskSection = {
    id: "profile#education",
    title: "Education",
    url: "/#experience",
    text: lines(
      ...profile.education.map(
        (school) =>
          `${school.degree}, ${school.school}, ${school.dates}${school.note ? `. ${school.note}` : ""}${school.taught ? `. What it taught me: ${school.taught}` : ""}`,
      ),
    ),
  };

  return [about, ...jobs, education];
}

function projectSections(project: Project): AskSection[] {
  const { links, story, visibility } = project;
  const hasPage = story !== undefined;
  const page = `/projects/${project.slug}`;

  const overview: AskSection = {
    id: `${project.slug}#overview`,
    title: project.title,
    url: hasPage ? page : "/#work",
    text: lines(
      `${project.title}: ${project.summary}`,
      project.why && `Why I made it: ${project.why}`,
      `Dates: ${project.dates} · Role: ${project.role} · Stack: ${project.stack.join(", ")}`,
      `Proof: ${project.proof.join("; ")}`,
      `Status: ${project.status.state}${project.status.note ? `, ${project.status.note}` : ""} (as of ${project.status.as_of})`,
      links.demo && `Live demo: ${links.demo}`,
      links.github && `Code: ${links.github}`,
      visibility.code === "private" && `Code is private${visibility.cannot_show ? `: ${visibility.cannot_show}` : ""}`,
    ),
  };

  if (!story) return [overview];
  return [
    overview,
    ...STORY_PARTS.map((part) => ({
      id: `${project.slug}#${part}`,
      title: `${project.title} · ${STORY_HEADINGS[part]}`,
      url: `${page}#story-${part}`,
      text: story[part],
    })),
  ];
}

/** Every section of the public site. Throws if two sections would share an id, so citations stay unambiguous. */
export function buildAskSections({ profile, projects, home, story }: AskContent): AskSection[] {
  const sections: AskSection[] = [
    ...profileSections(profile),
    { id: "home#bio", title: "Short bio", url: "/", text: lines(home.headline, home.bio) },
    ...story.chapters.map((chapter) => ({
      id: `story#${slugify(chapter.title)}`,
      title: `The long story · ${chapter.title}`,
      url: "/story",
      text: lines(chapter.label, chapter.body),
    })),
    ...projects.flatMap(projectSections),
  ];

  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.id)) throw new Error(`Two Ask sections share the id "${section.id}"`);
    seen.add(section.id);
  }
  return sections;
}

/** What the build writes to src/lib/generated/ask-index.json and the Ask route reads. */
export type AskIndex = {
  builtAt: string;
  /** The model that made `vectors`; the question must be embedded with the same one. */
  embeddingModel: string | null;
  sections: AskSection[];
  /** One vector per section, same order; null when the build had no API key (keyword search only). */
  vectors: number[][] | null;
  /** The only demos an answer may link to. */
  demos: { slug: string; title: string; url: string }[];
  /** The only address an email draft may go to. */
  contactEmail: string;
};
