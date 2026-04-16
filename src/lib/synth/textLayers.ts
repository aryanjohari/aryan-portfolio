import type { LayerEffectParams, SynthParams, TextLayer } from "./types";

export const MAX_TEXT_LAYERS = 4;

/** v1 single overlayText → one slot; v2 uses up to four `textLayers`. */
export function normalizedTextLayers(synth: SynthParams): {
  layers: TextLayer[];
  textLayerEffects: Record<string, Partial<LayerEffectParams>>;
} {
  if (synth.textLayers && synth.textLayers.length > 0) {
    return {
      layers: synth.textLayers.slice(0, MAX_TEXT_LAYERS),
      textLayerEffects: synth.textLayerEffects ?? {},
    };
  }
  return {
    layers: [
      {
        id: "v1-overlay",
        text: synth.overlayText ?? "",
        color: synth.textColor ?? "#ffffff",
        fontSize: synth.textSize ?? 64,
        offsetX: synth.textOffsetX ?? 0,
        offsetY: synth.textOffsetY ?? 0,
        scale: synth.textScale ?? 1,
        effectsLinked: true,
      },
    ],
    textLayerEffects: {},
  };
}

/**
 * When `effectsLinked` is true, use shared `layerEffects.text`.
 * Otherwise merge per-layer overrides from `textLayerEffects[layer.id]`.
 */
export function resolveTextLayerEffects(
  layer: TextLayer,
  defaultText: LayerEffectParams,
  textLayerEffects: Record<string, Partial<LayerEffectParams> | undefined>,
): LayerEffectParams {
  if (layer.effectsLinked) {
    return defaultText;
  }
  const o = textLayerEffects[layer.id];
  if (!o) return defaultText;
  return { ...defaultText, ...o };
}
