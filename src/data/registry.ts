export type ExhibitVariant = "api-sample" | "terminal-log" | "metrics";

export type DemoConfig =
  | { type: "iframe"; url: string }
  | { type: "api"; proxyPath: string }
  | { type: "exhibit"; variant: ExhibitVariant }
  | { type: "edge"; proxyPath: string };

export type RegistryEntry = {
  repo: string;
  slug: string;
  branch?: string;
  demo?: DemoConfig;
};

export const registry: RegistryEntry[] = [
  { repo: "aryanjohari/web-image-editor", slug: "background-studio", demo: { type: "iframe", url: "https://image.arkhives.nz" } },
  { repo: "aryanjohari/sound-visualiser", slug: "sound-visualiser", demo: { type: "iframe", url: "https://music.arkhives.nz" } },
  {
    repo: "aryanjohari/pii-gateway",
    slug: "pii-gateway",
    demo: { type: "exhibit", variant: "api-sample" },
  },
  {
    repo: "aryanjohari/ada",
    slug: "ada",
    demo: { type: "exhibit", variant: "terminal-log" },
  },
  {
    repo: "aryanjohari/gstf",
    slug: "gstf",
    demo: { type: "exhibit", variant: "metrics" },
  },
];
