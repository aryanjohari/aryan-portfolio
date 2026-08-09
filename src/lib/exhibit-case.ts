import type { Project } from "@/lib/projects";

export type ExhibitCaseBeat = {
  label: "Problem" | "Approach" | "Outcome";
  body: string;
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

/**
 * Lite case-study beats derived from existing yaml summary/description.
 * No new content fields — good enough for layout; refine per project later.
 */
export function exhibitCaseBeats(project: Project): ExhibitCaseBeat[] {
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
