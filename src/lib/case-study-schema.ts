export const CASE_STUDY_BEAT_KEYS = ["problem", "approach", "outcome"] as const;

export type CaseStudyBeatKey = (typeof CASE_STUDY_BEAT_KEYS)[number];

export type CaseStudyBeats = Record<CaseStudyBeatKey, string>;

export type CaseStudiesFile = {
  version: number;
  studies: Record<string, CaseStudyBeats>;
};

/** Hard upper bound per beat field (chars). */
export const CASE_STUDY_MAX_CHARS = 320;

/** Soft target range for authors — validation warns below this. */
export const CASE_STUDY_SOFT_MIN_CHARS = 80;

export type CaseStudyValidationIssue = {
  path: string;
  message: string;
};

export type CaseStudyValidationResult =
  | { ok: true; warnings: CaseStudyValidationIssue[] }
  | { ok: false; issues: CaseStudyValidationIssue[]; warnings: CaseStudyValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateCaseStudyBeats(
  beats: unknown,
  slug: string,
): CaseStudyValidationResult {
  const issues: CaseStudyValidationIssue[] = [];
  const warnings: CaseStudyValidationIssue[] = [];

  if (!isRecord(beats)) {
    issues.push({ path: slug, message: "study entry must be an object" });
    return { ok: false, issues, warnings };
  }

  for (const key of CASE_STUDY_BEAT_KEYS) {
    const path = `${slug}.${key}`;
    const value = beats[key];

    if (typeof value !== "string") {
      issues.push({ path, message: "must be a non-empty string" });
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      issues.push({ path, message: "must be a non-empty string" });
      continue;
    }

    if (trimmed.length > CASE_STUDY_MAX_CHARS) {
      issues.push({
        path,
        message: `exceeds ${CASE_STUDY_MAX_CHARS} characters (${trimmed.length})`,
      });
    }

    if (trimmed.length < CASE_STUDY_SOFT_MIN_CHARS) {
      warnings.push({
        path,
        message: `under ${CASE_STUDY_SOFT_MIN_CHARS} characters (${trimmed.length}) — aim for 1–2 sentences`,
      });
    }
  }

  return issues.length > 0 ? { ok: false, issues, warnings } : { ok: true, warnings };
}

export function validateCaseStudiesFile(
  raw: unknown,
  requiredSlugs: readonly string[],
): CaseStudyValidationResult {
  const issues: CaseStudyValidationIssue[] = [];
  const warnings: CaseStudyValidationIssue[] = [];

  if (!isRecord(raw)) {
    return {
      ok: false,
      issues: [{ path: "(root)", message: "must be an object" }],
      warnings,
    };
  }

  if (raw.version !== 1) {
    issues.push({
      path: "version",
      message: `expected version 1, got ${String(raw.version)}`,
    });
  }

  if (!isRecord(raw.studies)) {
    issues.push({ path: "studies", message: "must be an object" });
    return { ok: false, issues, warnings };
  }

  const studies = raw.studies as Record<string, unknown>;

  for (const slug of requiredSlugs) {
    if (!(slug in studies)) {
      issues.push({
        path: `studies.${slug}`,
        message: "missing case study for registry slug",
      });
      continue;
    }

    const result = validateCaseStudyBeats(studies[slug], slug);
    if (!result.ok) {
      issues.push(...result.issues);
    }
    warnings.push(...result.warnings);
  }

  return issues.length > 0 ? { ok: false, issues, warnings } : { ok: true, warnings };
}
