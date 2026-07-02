export type DemoConfig =
  | { type: "iframe"; url: string }
  | { type: "api"; proxyPath: string }
  | { type: "exhibit"; assetsPath?: string }
  | { type: "edge"; proxyPath: string };

export type RegistryEntry = {
  repo: string;
  slug: string;
  branch?: string;
  demo?: DemoConfig;
};

export const registry: RegistryEntry[] = [
  { repo: "aryanjohari/image-web-editor", slug: "background-studio", demo: { type: "iframe", url: "https://image.arkhives.nz" } },
  { repo: "aryanjohari/sound-visualiser", slug: "sound-visualiser", demo: { type: "iframe", url: "https://music.arkhives.nz" } },
  { repo: "aryanjohari/pii-gateway", slug: "pii-gateway" },
  { repo: "aryanjohari/ada", slug: "ada" },
  { repo: "aryanjohari/gstf", slug: "gstf" },
];
