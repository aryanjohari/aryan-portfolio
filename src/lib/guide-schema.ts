export type GuideContextProject = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  stack: string[];
  demo?: boolean;
};

export type GuideExperienceEntry = {
  role: string;
  company: string;
  location?: string;
  period: string;
  highlights: string[];
};

export type GuideEducationEntry = {
  degree: string;
  institution: string;
  location?: string;
  period: string;
  notes?: string;
};

export type SuggestedChipGroup = "simple" | "technical";

export type SuggestedChip = {
  group: SuggestedChipGroup;
  label: string;
  prompt: string;
  tooltip: string;
};

export type TenureRoleHint = {
  role: string;
  company: string;
  period: string;
  approxMonths: number;
};

export type TenureAreaHint = {
  label: string;
  approxMonths: number;
  note: string;
};

export type TenureHints = {
  asOf: string;
  professional: {
    approxYears: number;
    wording: string;
    roles: TenureRoleHint[];
  };
  byArea?: TenureAreaHint[];
  caveats: string[];
};

export type GuideContextFile = {
  builtAt: string;
  identity: string;
  resumeText: string;
  experience: GuideExperienceEntry[];
  education: GuideEducationEntry[];
  skills?: string[];
  tenureHints?: TenureHints;
  meta: {
    projectCount: number;
    featuredDemoSlugs: string[];
    contextCharCount: number;
  };
  projects: GuideContextProject[];
  suggestedChips: SuggestedChip[];
};

export const DEFAULT_SUGGESTED_CHIPS: SuggestedChip[] = [
  {
    group: "simple",
    label: "Who is he?",
    prompt: "Who is Aryan?",
    tooltip: "A short plain-English intro to Aryan.",
  },
  {
    group: "simple",
    label: "Is he looking for work?",
    prompt: "Is Aryan looking for work?",
    tooltip: "Availability and when he can start in Auckland.",
  },
  {
    group: "simple",
    label: "Show me something cool",
    prompt: "Show me something cool from the portfolio.",
    tooltip: "Pick a live demo or standout project to try.",
  },
  {
    group: "technical",
    label: "Backend / ML focus?",
    prompt: "What's Aryan's backend and ML focus?",
    tooltip: "Stack and strengths on the backend and ML side.",
  },
  {
    group: "technical",
    label: "What's ADA?",
    prompt: "What is ADA?",
    tooltip: "Explain the ADA project in one clear answer.",
  },
  {
    group: "technical",
    label: "What's live?",
    prompt: "What projects have live demos?",
    tooltip: "Which projects you can open and try in the browser.",
  },
];
