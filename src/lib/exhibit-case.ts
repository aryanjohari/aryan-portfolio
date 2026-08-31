import caseStudies from "../../content/project-case-studies.json";
import type { Project } from "@/lib/projects";
import type { CaseStudiesFile, CaseStudyBeats } from "@/lib/case-study-schema";

export type ExhibitCaseBeat = {
  label: "Problem" | "Approach" | "Outcome";
  body: string;
};

const AUTHORED = caseStudies as CaseStudiesFile;

const BEAT_LABELS: Record<keyof CaseStudyBeats, ExhibitCaseBeat["label"]> = {
  problem: "Problem",
  approach: "Approach",
  outcome: "Outcome",
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clip(text: string, max = 180): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 40 ? cut.slice(0, at) : cut).trim()}…`;
}

export function hasAuthoredCaseStudy(slug: string): boolean {
  return slug in AUTHORED.studies;
}

function authoredBeats(slug: string): ExhibitCaseBeat[] | null {
  const study = AUTHORED.studies[slug];
  if (!study) return null;

  return (["problem", "approach", "outcome"] as const).map((key) => ({
    label: BEAT_LABELS[key],
    body: study[key].trim(),
  }));
}

function heuristicBeats(project: Project): ExhibitCaseBeat[] {
  const summary = project.summary.trim();
  const description = project.description.trim();
  const parts = sentences(description);

  const problem = summary || parts[0] || "—";
  const approach =
    parts.find((s) => s !== summary && s !== problem) ??
    parts[0] ??
    (summary || "—");
  let outcome =
    [...parts].reverse().find((s) => s !== problem && s !== approach) ?? "";

  if (!outcome) {
    const stackHint = project.stack.slice(0, 3).join(", ");
    outcome = stackHint
      ? `Shipped with ${stackHint}.`
      : "See the stage below for the live system.";
  }

  return [
    { label: "Problem", body: clip(problem) },
    { label: "Approach", body: clip(approach) },
    { label: "Outcome", body: clip(outcome) },
  ];
}

/**
 * Case-study beats for the exhibit "In brief" section.
 * Prefers portfolio-authored copy; falls back to yaml heuristics.
 */
export function exhibitCaseBeats(project: Project): ExhibitCaseBeat[] {
  return authoredBeats(project.slug) ?? heuristicBeats(project);
}
