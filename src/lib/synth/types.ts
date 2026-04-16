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

/** Up to four text layers (matches image-synth / webgl shader slots T0–T3). */
export type TextLayer = {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  effectsLinked: boolean;
};

/**
 * v1: single overlay via overlayText + offsets.
 * v2: textLayers + optional per-layer effect overrides in textLayerEffects.
 */
export type SynthParams = {
  decalScale: number;
  decalOffsetX: number;
  decalOffsetY: number;
  linkDecalToMath: boolean;
  linkTextToMath: boolean;
  /** v1 */
  overlayText?: string;
  textColor?: string;
  textSize?: number;
  textOffsetX?: number;
  textOffsetY?: number;
  textScale?: number;
  /** v2 */
  textLayers?: TextLayer[];
  selectedTextLayerId?: string;
  textLayerEffects?: Record<string, Partial<LayerEffectParams>>;
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
