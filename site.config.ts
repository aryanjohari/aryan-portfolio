/** Hero WebGL: pointer, head follow, hover, and rim light — tune without touching components */
export const hero3d = {
  /**
   * `viewport` — pointer is taken from the whole page (needed when HTML sits above the canvas).
   * `canvas` — only movement while the cursor is over the WebGL canvas.
   */
  pointerScope: "viewport" as "viewport" | "canvas",
  headTracking: {
    enabled: true,
    maxYawRad: 0.48,
    maxPitchRad: 0.52,
    pitchClampMin: -0.26,
    pitchClampMax: 0.44,
    /** Neck caps as a fraction of head caps */
    neckYawScale: 0.38,
    neckPitchScale: 0.32,
    neckPitchClampScale: 0.45,
    lerpSpeed: 12,
  },
  /** Left index finger “points” toward the cursor (Mixamo: LeftHandIndex1/2) */
  pointerFinger: {
    enabled: true,
    maxYawRad: 0.9,
    maxPitchRad: 0.6,
    pitchClampMin: -0.4,
    pitchClampMax: 0.55,
    /** Second phalanx pitches a fraction of the knuckle for a natural bend */
    index2PitchScale: 0.38,
    lerpSpeed: 16,
  },
  hoverHighlight: {
    enabled: true,
    emissive: "#1a1f28",
    intensity: 0.55,
  },
  lightFollow: {
    enabled: true,
    xy: 3,
    z: 2.5,
  },
} as const;

export type Hero3dSettings = typeof hero3d;

export const siteConfig = {
  authorName: "Aryan",
  hero3d,
  colors: {
    background: "#000000",
    surface: "#111111",
    acidAccent: "#ccff00",
    textPrimary: "#ffffff",
    textMuted: "#888888",
  },
  fonts: {
    heading: {
      displayName: "Instrument Serif",
      nextFontId: "Instrument_Serif",
    },
    mono: {
      displayName: "IBM Plex Mono",
      nextFontId: "IBM_Plex_Mono",
    },
  },
  urls: {
    githubApiBase: "https://api.github.com",
    s3AssetBucketBase:
      "https://portfolio-assets.s3.ap-southeast-2.amazonaws.com",
    liveDemos: {
      placeholder: "https://example.com",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
