export type LayerId = "background" | "decal" | "text";

export type LayerEffectParams = {
  meltIntensity: number;
  colorBleed: number;
  noiseLevel: number;
  posterizeSteps: number;
  timeScale: number;
  maskCenterX: number;
  maskCenterY: number;
  maskRadius: number;
  twirlIntensity: number;
  colorA: string;
  colorB: string;
  duotoneBlend: number;
  colorCycleSpeed: number;
  halftoneIntensity: number;
  scanlineIntensity: number;
};

export type LayerEffectsMap = Record<LayerId, LayerEffectParams>;

export type SynthParams = {
  overlayText: string;
  textColor: string;
  textSize: number;
  decalScale: number;
  decalOffsetX: number;
  decalOffsetY: number;
  linkDecalToMath: boolean;
  textOffsetX: number;
  textOffsetY: number;
  textScale: number;
  linkTextToMath: boolean;
};

export type PresetViewport = {
  drawBufferWidth: number;
  drawBufferHeight: number;
  cssWidth?: number;
  cssHeight?: number;
  dpr?: number;
};

export type InlineAsset = {
  mime: string;
  dataBase64: string;
};

export type SynthPresetAssets = {
  background?: InlineAsset | null;
  decal?: InlineAsset | null;
};

export type SynthPreset = {
  presetSchemaVersion: number;
  engineVersion?: string;
  synth: SynthParams;
  layerEffects: LayerEffectsMap;
  imageResolution: { width: number; height: number };
  viewport?: PresetViewport;
  baseTimeSeconds?: number;
  assets: SynthPresetAssets;
};
