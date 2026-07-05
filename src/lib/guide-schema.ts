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

export type GuideContextFile = {
  builtAt: string;
  identity: string;
  resumeText: string;
  experience: GuideExperienceEntry[];
  education: GuideEducationEntry[];
  skills?: string[];
  meta: {
    projectCount: number;
    featuredDemoSlugs: string[];
    contextCharCount: number;
  };
  projects: GuideContextProject[];
  suggestedPrompts: string[];
};

export const DEFAULT_SUGGESTED_PROMPTS = [
  "What projects have live demos?",
  "Tell me about GSTF",
  "Are you available for work in Auckland?",
  "What's your tech stack?",
  "Summarize your background",
  "What is Background Studio?",
  "What is your work experience?",
  "Tell me about your SEO role",
] as const;
