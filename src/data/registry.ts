export type DemoConfig =
  | { type: "iframe"; url: string }
  | { type: "api"; proxyPath: string }
  | { type: "exhibit"; assetsPath?: string }
  | { type: "edge"; proxyPath: string };

export type RegistryEntry = {
  repo: string;
  slug: string;
  demo?: DemoConfig;
};

export const registry: RegistryEntry[] = [
  { repo: "aryanjohari/background-studio", slug: "background-studio", demo: { type: "iframe", url: "https://music.arkhives.nz" } },
  { repo: "aryanjohari/sound-visualiser", slug: "sound-visualiser" },
  { repo: "aryanjohari/pii-gateway", slug: "pii-gateway" },
  { repo: "aryanjohari/ada", slug: "ada" },
  { repo: "aryanjohari/gstf", slug: "gstf" },
];
