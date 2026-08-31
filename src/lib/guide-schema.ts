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

export type SuggestedChipKind = "ask" | "navigate";

export type SuggestedChip = {
  kind: SuggestedChipKind;
  label: string;
  prompt: string;
  tooltip: string;
  /** Required when kind === "navigate" — expected destination for tests/docs */
  navigateTo?: "/" | "/about" | "/projects" | `/projects/${string}`;
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
    kind: "ask",
    label: "Who is Aryan?",
    prompt: "Who is Aryan?",
    tooltip: "A short plain-English intro to Aryan.",
  },
  {
    kind: "ask",
    label: "What can he build?",
    prompt: "What can Aryan build?",
    tooltip: "Projects and capabilities across systems, AI, and the browser.",
  },
  {
    kind: "ask",
    label: "What's his stack?",
    prompt: "What's Aryan's skillset and stack?",
    tooltip: "Languages, frameworks, and tools from the knowledge context.",
  },
  {
    kind: "navigate",
    label: "Go to projects",
    prompt: "Go to projects",
    tooltip: "Navigate to the projects gallery via the guide.",
    navigateTo: "/projects",
  },
  {
    kind: "navigate",
    label: "Go to about",
    prompt: "Take me to about",
    tooltip: "Navigate to the about essay via the guide.",
    navigateTo: "/about",
  },
];
