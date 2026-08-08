#!/usr/bin/env tsx
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { PDFParse } from "pdf-parse";

import { registry } from "../src/data/registry";
import {
  DEFAULT_SUGGESTED_CHIPS,
  type GuideContextFile,
  type GuideEducationEntry,
  type GuideExperienceEntry,
  type TenureAreaHint,
  type TenureHints,
  type TenureRoleHint,
} from "../src/lib/guide-schema";
import type { FetchedProjectsFile } from "../src/lib/portfolio-schema";

const IDENTITY_PATH = resolve(process.cwd(), "content/guide-context.md");
const FETCHED_PATH = resolve(process.cwd(), "src/lib/fetched-projects.json");
const OUTPUT_PATH = resolve(process.cwd(), "src/lib/guide-context.json");
const RESUME_PATH = resolve(process.cwd(), "public/resume.pdf");
const EXPERIENCE_MD_PATH = resolve(process.cwd(), "content/experience.md");

const MAX_RESUME_TEXT_CHARS = 6000;
const MAX_PROJECT_DESCRIPTION_CHARS = 400;
const MAX_TOTAL_CONTEXT_CHARS = 24000;

const SECTION_HEADERS = [
  "Summary",
  "Skills",
  "Education",
  "Projects",
  "Experience",
] as const;

const PERIOD_PATTERN =
  /([A-Z][a-z]{2,8}\s+\d{4}\s*[–-]\s*(?:Present|[A-Z][a-z]{2,8}\s+\d{4}))/;

function loadEnvFile(filename: string): void {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function readIdentity(): string {
  return readFileSync(IDENTITY_PATH, "utf8").trim();
}

function readFetchedProjects(): FetchedProjectsFile | null {
  try {
    const raw = readFileSync(FETCHED_PATH, "utf8");
    return JSON.parse(raw) as FetchedProjectsFile;
  } catch {
    return null;
  }
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractResumeText(): Promise<string> {
  if (!existsSync(RESUME_PATH)) {
    console.warn(`Resume not found at ${RESUME_PATH} — resumeText will be empty.`);
    return "";
  }

  const buffer = readFileSync(RESUME_PATH);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text);
  } finally {
    await parser.destroy();
  }
}

function parseResumeSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  if (!text) return sections;

  const headerPattern = new RegExp(
    `^(${SECTION_HEADERS.join("|")})\\s*$`,
    "gim",
  );
  const matches: Array<{ name: string; index: number; length: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = headerPattern.exec(text)) !== null) {
    matches.push({
      name: match[1]!,
      index: match.index,
      length: match[0].length,
    });
  }

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i]!;
    const start = current.index + current.length;
    const end = matches[i + 1]?.index ?? text.length;
    sections[current.name] = text.slice(start, end).trim();
  }

  return sections;
}

function parseBulletLines(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[•\-–]\s*/.test(line))
    .map((line) => line.replace(/^[•\-–]\s*/, "").trim())
    .filter(Boolean);
}

function splitCompanyLocation(line: string): { company: string; location?: string } {
  const knownLocations = [
    "Auckland, New Zealand",
    "Mumbai, India",
  ];

  for (const location of knownLocations) {
    if (line.endsWith(location)) {
      return {
        company: line.slice(0, -location.length).trim(),
        location,
      };
    }
  }

  const commaIdx = line.lastIndexOf(",");
  if (commaIdx > 0) {
    return {
      company: line.slice(0, commaIdx).trim(),
      location: line.slice(commaIdx + 1).trim(),
    };
  }

  return { company: line.trim() };
}

function parseExperience(section: string): GuideExperienceEntry[] {
  if (!section.trim()) return [];

  const entries: GuideExperienceEntry[] = [];
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const periodMatch = line.match(PERIOD_PATTERN);

    if (!periodMatch) {
      i += 1;
      continue;
    }

    const period = periodMatch[1]!.replace(/\s+/g, " ").trim();
    const role = line.slice(0, periodMatch.index).trim();
    i += 1;

    if (!lines[i]) break;

    const { company, location } = splitCompanyLocation(lines[i]!);
    i += 1;

    const highlights: string[] = [];
    while (i < lines.length) {
      const next = lines[i]!;
      if (PERIOD_PATTERN.test(next) && !/^[•\-–]/.test(next)) {
        break;
      }
      if (/^[•\-–]/.test(next)) {
        highlights.push(next.replace(/^[•\-–]\s*/, "").trim());
        i += 1;
        continue;
      }
      break;
    }

    if (role && company) {
      entries.push({
        role,
        company,
        ...(location ? { location } : {}),
        period,
        highlights,
      });
    }
  }

  return entries;
}

function parseEducation(section: string): GuideEducationEntry[] {
  if (!section.trim()) return [];

  const entries: GuideEducationEntry[] = [];
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const periodMatch = line.match(PERIOD_PATTERN);

    if (!periodMatch) {
      i += 1;
      continue;
    }

    const period = periodMatch[1]!.replace(/\s+/g, " ").trim();
    const degree = line.slice(0, periodMatch.index).trim();
    i += 1;

    if (!lines[i]) break;

    const { company: institution, location } = splitCompanyLocation(lines[i]!);
    i += 1;

    const notes = parseBulletLines(
      lines.slice(i).join("\n").split("\n").slice(0, 3).join("\n"),
    );
    while (i < lines.length && /^[•\-–]/.test(lines[i]!)) {
      i += 1;
    }

    if (degree && institution) {
      entries.push({
        degree,
        institution,
        ...(location ? { location } : {}),
        period,
        ...(notes.length > 0 ? { notes: notes.join(" ") } : {}),
      });
    }
  }

  return entries;
}

function parseSkills(section: string): string[] {
  if (!section.trim()) return [];

  return section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return [line];
      const category = line.slice(0, colonIdx).trim();
      const items = line
        .slice(colonIdx + 1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return items.map((item) => `${category}: ${item}`);
    });
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

type MonthPoint = { year: number; month: number };

function parseMonthYear(token: string): MonthPoint | null {
  const match = token.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTH_INDEX[match[1]!.toLowerCase()];
  if (month === undefined) return null;
  return { year: Number(match[2]), month };
}

function parsePeriodRange(
  period: string,
  asOf: Date,
): { start: MonthPoint; end: MonthPoint; endedPresent: boolean } | null {
  const parts = period.split(/[–-]/).map((part) => part.trim());
  if (parts.length !== 2) return null;
  const start = parseMonthYear(parts[0]!);
  if (!start) return null;

  const endToken = parts[1]!;
  if (/^present$/i.test(endToken)) {
    return {
      start,
      end: { year: asOf.getFullYear(), month: asOf.getMonth() },
      endedPresent: true,
    };
  }

  const end = parseMonthYear(endToken);
  if (!end) return null;
  return { start, end, endedPresent: false };
}

/** Inclusive month span: Jan 2024 – Jan 2024 = 1 month. */
function monthsBetweenInclusive(start: MonthPoint, end: MonthPoint): number {
  const delta =
    (end.year - start.year) * 12 + (end.month - start.month) + 1;
  return Math.max(0, delta);
}

function monthsToYearsWording(approxMonths: number): {
  approxYears: number;
  wording: string;
} {
  const approxYears = Math.round((approxMonths / 12) * 10) / 10;
  if (approxMonths < 10) {
    return {
      approxYears,
      wording: `roughly ${approxMonths} months of listed professional roles`,
    };
  }
  const rounded =
    approxYears % 1 === 0 ? String(approxYears) : approxYears.toFixed(1);
  return {
    approxYears,
    wording: `about ${rounded} year${approxYears === 1 ? "" : "s"} of listed professional roles`,
  };
}

function classifyExperienceArea(
  entry: GuideExperienceEntry,
): string | undefined {
  const haystack = `${entry.role} ${entry.highlights.join(" ")}`.toLowerCase();
  if (
    /\bseo\b/.test(haystack) ||
    /\bsearch console\b/.test(haystack) ||
    /\borganic\b/.test(haystack)
  ) {
    return "SEO / web growth";
  }
  if (
    /\bwebsite developer\b/.test(haystack) ||
    /\bweb developer\b/.test(haystack) ||
    /\bwordpress\b/.test(haystack) ||
    /\bshopify\b/.test(haystack)
  ) {
    return "Web development";
  }
  return undefined;
}

function buildTenureHints(
  experience: GuideExperienceEntry[],
  asOfDate: Date = new Date(),
): TenureHints {
  const asOf = asOfDate.toISOString();
  const caveats: string[] = [
    "Approximate only — computed from listed role periods at build time.",
    "Do not invent employers, titles, or metrics beyond this rollup.",
  ];

  const roles: TenureRoleHint[] = [];
  let usedPresent = false;

  for (const entry of experience) {
    const range = parsePeriodRange(entry.period, asOfDate);
    if (!range) {
      caveats.push(`Could not parse period for ${entry.role} at ${entry.company}.`);
      continue;
    }
    if (range.endedPresent) usedPresent = true;
    roles.push({
      role: entry.role,
      company: entry.company,
      period: entry.period,
      approxMonths: monthsBetweenInclusive(range.start, range.end),
    });
  }

  if (usedPresent) {
    caveats.push(
      `Roles ending in Present are measured through the build date (${asOf.slice(0, 10)}).`,
    );
  }

  const totalMonths = roles.reduce((sum, role) => sum + role.approxMonths, 0);
  const { approxYears, wording } = monthsToYearsWording(totalMonths);

  if (experience.length >= 2) {
    caveats.push(
      "Role months are summed per listed period; overlapping calendar months (if any) are not de-duplicated.",
    );
  }

  const areaMonths = new Map<string, number>();
  for (const entry of experience) {
    const label = classifyExperienceArea(entry);
    if (!label) continue;
    const range = parsePeriodRange(entry.period, asOfDate);
    if (!range) continue;
    const months = monthsBetweenInclusive(range.start, range.end);
    areaMonths.set(label, (areaMonths.get(label) ?? 0) + months);
  }

  const byArea: TenureAreaHint[] | undefined =
    areaMonths.size > 0
      ? [...areaMonths.entries()].map(([label, approxMonths]) => ({
          label,
          approxMonths,
          note: `Based on listed role titles/highlights matching ${label}.`,
        }))
      : undefined;

  return {
    asOf,
    professional: {
      approxYears,
      wording,
      roles,
    },
    ...(byArea ? { byArea } : {}),
    caveats,
  };
}

function mergeExperienceFromMarkdown(
  parsed: GuideExperienceEntry[],
): GuideExperienceEntry[] {
  if (!existsSync(EXPERIENCE_MD_PATH)) {
    return parsed;
  }

  try {
    const raw = readFileSync(EXPERIENCE_MD_PATH, "utf8").trim();
    if (!raw) return parsed;

    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const supplemental = JSON.parse(jsonMatch[1]!) as GuideExperienceEntry[];
      if (Array.isArray(supplemental) && supplemental.length > 0) {
        console.log(
          `Merging ${supplemental.length} experience entries from content/experience.md`,
        );
        return supplemental;
      }
    }
  } catch (error) {
    console.warn(
      "Could not parse content/experience.md:",
      error instanceof Error ? error.message : error,
    );
  }

  return parsed;
}

function estimateContextCharCount(output: Omit<GuideContextFile, "meta"> & {
  meta: Omit<GuideContextFile["meta"], "contextCharCount">;
}): number {
  return JSON.stringify(output).length;
}

async function buildGuideContext(): Promise<GuideContextFile> {
  const identity = readIdentity();
  const fetched = readFetchedProjects();
  const liveDemoSlugs = new Set(
    registry
      .filter((entry) => entry.demo?.type === "iframe")
      .map((entry) => entry.slug),
  );

  const fullResumeText = await extractResumeText();
  const resumeSections = parseResumeSections(fullResumeText);

  let experience = mergeExperienceFromMarkdown(
    parseExperience(resumeSections.Experience ?? ""),
  );
  const education = parseEducation(resumeSections.Education ?? "");
  const skills = parseSkills(resumeSections.Skills ?? "");
  const resumeText = truncateText(fullResumeText, MAX_RESUME_TEXT_CHARS);

  if (experience.length === 0 && fullResumeText) {
    console.warn(
      "Structured experience parse yielded 0 entries — answers will rely on resumeText.",
    );
  }

  const projects =
    fetched?.results
      .filter((result) => result.status === "ok")
      .map((result) => ({
        slug: result.slug,
        title: result.yaml.title,
        summary: result.yaml.summary,
        description: truncateText(
          result.yaml.description,
          MAX_PROJECT_DESCRIPTION_CHARS,
        ),
        stack: result.yaml.stack,
        ...(liveDemoSlugs.has(result.slug) ? { demo: true } : {}),
      })) ?? [];

  const featuredDemoSlugs = projects
    .filter((project) => project.demo)
    .map((project) => project.slug);

  const builtAt = new Date().toISOString();
  const tenureHints = buildTenureHints(experience, new Date(builtAt));

  const baseOutput = {
    builtAt,
    identity,
    resumeText,
    experience,
    education,
    ...(skills.length > 0 ? { skills } : {}),
    tenureHints,
    meta: {
      projectCount: projects.length,
      featuredDemoSlugs,
      contextCharCount: 0,
    },
    projects,
    suggestedChips: DEFAULT_SUGGESTED_CHIPS.map((chip) => ({ ...chip })),
  };

  const contextCharCount = estimateContextCharCount(baseOutput);

  return {
    ...baseOutput,
    meta: {
      ...baseOutput.meta,
      contextCharCount,
    },
  };
}

async function main(): Promise<void> {
  if (process.env.PORTFOLIO_FETCH_SKIP === "true") {
    console.log(
      "PORTFOLIO_FETCH_SKIP=true — building guide context from guide-context.md, resume.pdf, and existing fetched-projects.json.",
    );
  }

  const output = await buildGuideContext();
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${OUTPUT_PATH} (${output.projects.length} projects, ${output.meta.featuredDemoSlugs.length} live demos)`,
  );
  console.log(
    `resumeText: ${output.resumeText.length} chars | experience: ${output.experience.length} entries | education: ${output.education.length} | skills: ${output.skills?.length ?? 0} | contextCharCount: ${output.meta.contextCharCount}`,
  );
  if (output.tenureHints) {
    console.log(
      `tenureHints: ${output.tenureHints.professional.wording} (${output.tenureHints.professional.approxYears}y)`,
    );
  }

  if (output.meta.contextCharCount > MAX_TOTAL_CONTEXT_CHARS) {
    console.warn(
      `Context size ${output.meta.contextCharCount} exceeds budget ${MAX_TOTAL_CONTEXT_CHARS}.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
