"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Color,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  ShaderMaterial,
  type Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";

import {
  MAX_TEXT_LAYERS,
  normalizedTextLayers,
  resolveTextLayerEffects,
} from "@/lib/synth/textLayers";
import { createTextTexture } from "@/lib/synth/textTexture";
import type {
  LayerEffectParams,
  LayerEffectsMap,
  SynthParams,
} from "@/lib/synth/types";
import { synthFragmentShader } from "@/shaders/synth/fragment";
import { synthVertexShader } from "@/shaders/synth/vertex";

const TEXT_PREFIXES = ["T0", "T1", "T2", "T3"] as const;

const fallbackTexture = new DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1,
  1,
  RGBAFormat,
  UnsignedByteType,
);
fallbackTexture.generateMipmaps = false;
fallbackTexture.minFilter = LinearFilter;
fallbackTexture.magFilter = LinearFilter;
fallbackTexture.needsUpdate = true;

const transparentFallbackTexture = new DataTexture(
  new Uint8Array([0, 0, 0, 0]),
  1,
  1,
  RGBAFormat,
  UnsignedByteType,
);
transparentFallbackTexture.generateMipmaps = false;
transparentFallbackTexture.minFilter = LinearFilter;
transparentFallbackTexture.magFilter = LinearFilter;
transparentFallbackTexture.colorSpace = SRGBColorSpace;
transparentFallbackTexture.needsUpdate = true;

function applyLayerUniforms(
  mat: ShaderMaterial,
  prefix: string,
  p: LayerEffectParams,
  baseTime: number,
) {
  const t = baseTime * p.timeScale;
  const u = mat.uniforms;
  u[`u_${prefix}_t`].value = t;
  u[`u_${prefix}_melt`].value = p.meltIntensity;
  u[`u_${prefix}_bleed`].value = p.colorBleed;
  u[`u_${prefix}_noise`].value = p.noiseLevel;
  u[`u_${prefix}_posterize`].value = p.posterizeSteps;
  (u[`u_${prefix}_maskCenter`].value as Vector2).set(
    p.maskCenterX,
    p.maskCenterY,
  );
  u[`u_${prefix}_maskRadius`].value = p.maskRadius;
  u[`u_${prefix}_twirl`].value = p.twirlIntensity;
  (u[`u_${prefix}_colorA`].value as Color).setStyle(p.colorA);
  (u[`u_${prefix}_colorB`].value as Color).setStyle(p.colorB);
  u[`u_${prefix}_duotoneBlend`].value = p.duotoneBlend;
  u[`u_${prefix}_colorCycle`].value = p.colorCycleSpeed;
  u[`u_${prefix}_halftone`].value = p.halftoneIntensity;
  u[`u_${prefix}_scanline`].value = p.scanlineIntensity;
}

function seedLayerUniforms(
  prefix: string,
  p: LayerEffectParams,
  baseTime: number,
) {
  const t = baseTime * p.timeScale;
  return {
    [`u_${prefix}_t`]: { value: t },
    [`u_${prefix}_melt`]: { value: p.meltIntensity },
    [`u_${prefix}_bleed`]: { value: p.colorBleed },
    [`u_${prefix}_noise`]: { value: p.noiseLevel },
    [`u_${prefix}_posterize`]: { value: p.posterizeSteps },
    [`u_${prefix}_maskCenter`]: {
      value: new Vector2(p.maskCenterX, p.maskCenterY),
    },
    [`u_${prefix}_maskRadius`]: { value: p.maskRadius },
    [`u_${prefix}_twirl`]: { value: p.twirlIntensity },
    [`u_${prefix}_colorA`]: { value: new Color(p.colorA) },
    [`u_${prefix}_colorB`]: { value: new Color(p.colorB) },
    [`u_${prefix}_duotoneBlend`]: { value: p.duotoneBlend },
    [`u_${prefix}_colorCycle`]: { value: p.colorCycleSpeed },
    [`u_${prefix}_halftone`]: { value: p.halftoneIntensity },
    [`u_${prefix}_scanline`]: { value: p.scanlineIntensity },
  };
}

function buildTextSlotUniforms(
  le: { text: LayerEffectParams },
  baseTime: number,
) {
  let out: Record<string, unknown> = {};
  for (const prefix of TEXT_PREFIXES) {
    out = { ...out, ...seedLayerUniforms(prefix, le.text, baseTime) };
  }
  return out;
}

export type PresetSynthMaterialProps = {
  synth: SynthParams;
  layerEffects: LayerEffectsMap;
  imageResolution: { width: number; height: number };
  backgroundTexture: Texture;
  decalTexture: Texture | null;
  /** Continues animation phase from exported snapshot (seconds). */
  initialTimeOffsetSeconds?: number;
  revealProgress?: number;
  introEnabled?: boolean;
};

export function PresetSynthMaterial({
  synth,
  layerEffects,
  imageResolution,
  backgroundTexture,
  decalTexture,
  initialTimeOffsetSeconds = 0,
  revealProgress = 1,
  introEnabled = false,
}: PresetSynthMaterialProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const textTextureRefs = useRef<(CanvasTexture | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const { size } = useThree();

  const textState = useMemo(() => normalizedTextLayers(synth), [synth]);

  const uniforms = useMemo(() => {
    const le = layerEffects;
    const baseTime = 0;
    const s = synth;
    return {
      u_resolution: { value: new Vector2(size.width, size.height) },
      u_imageResolution: {
        value: new Vector2(imageResolution.width, imageResolution.height),
      },
      u_texture: { value: backgroundTexture ?? fallbackTexture },
      u_decalTexture: { value: transparentFallbackTexture },
      u_decalTransform: {
        value: new Vector3(s.decalOffsetX, s.decalOffsetY, s.decalScale),
      },
      u_linkDecalToMath: { value: s.linkDecalToMath ? 1.0 : 0.0 },
      u_linkTextToMath: { value: 0.0 },
      u_textSlot0: { value: transparentFallbackTexture },
      u_textTransform0: { value: new Vector3(0, 0, 1) },
      u_textActive0: { value: 0.0 },
      u_textSlot1: { value: transparentFallbackTexture },
      u_textTransform1: { value: new Vector3(0, 0, 1) },
      u_textActive1: { value: 0.0 },
      u_textSlot2: { value: transparentFallbackTexture },
      u_textTransform2: { value: new Vector3(0, 0, 1) },
      u_textActive2: { value: 0.0 },
      u_textSlot3: { value: transparentFallbackTexture },
      u_textTransform3: { value: new Vector3(0, 0, 1) },
      u_textActive3: { value: 0.0 },
      ...seedLayerUniforms("L0", le.background, baseTime),
      ...seedLayerUniforms("L1", le.decal, baseTime),
      ...buildTextSlotUniforms(le, baseTime),
      u_bootReveal: { value: revealProgress },
      u_introProgress: { value: revealProgress },
    };
  }, [
    size.width,
    size.height,
    imageResolution.width,
    imageResolution.height,
    backgroundTexture,
    layerEffects,
    revealProgress,
    synth,
  ]);

  useEffect(() => {
    if (materialRef.current && backgroundTexture) {
      materialRef.current.uniforms.u_texture.value = backgroundTexture;
      materialRef.current.needsUpdate = true;
    }
  }, [backgroundTexture]);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;

    for (let i = 0; i < MAX_TEXT_LAYERS; i++) {
      textTextureRefs.current[i]?.dispose();
      textTextureRefs.current[i] = null;
    }

    const { layers } = textState;
    for (let i = 0; i < MAX_TEXT_LAYERS; i++) {
      const layer = layers[i];
      if (!layer) continue;
      const trimmed = layer.text.trim();
      if (trimmed.length === 0) continue;
      const generated = createTextTexture(
        layer.text,
        size.width,
        size.height,
        layer.color,
        layer.fontSize,
      );
      if (generated) {
        textTextureRefs.current[i] = generated;
      }
    }
    mat.needsUpdate = true;
  }, [textState, size.width, size.height]);

  useEffect(() => {
    const textureRefs = textTextureRefs.current;
    return () => {
      for (let i = 0; i < MAX_TEXT_LAYERS; i++) {
        textureRefs[i]?.dispose();
        textureRefs[i] = null;
      }
    };
  }, []);

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;

    const le = layerEffects;
    const { layers, textLayerEffects: tfx } = textState;

    const exportTime = (window as Window & { __SYNTH_EXPORT_TIME__?: number })
      .__SYNTH_EXPORT_TIME__;
    const baseTime =
      typeof exportTime === "number"
        ? exportTime
        : state.clock.elapsedTime + initialTimeOffsetSeconds;

    mat.uniforms.u_resolution.value.set(state.size.width, state.size.height);
    mat.uniforms.u_imageResolution.value.set(
      imageResolution.width,
      imageResolution.height,
    );

    const tex = backgroundTexture ?? fallbackTexture;
    mat.uniforms.u_texture.value = tex;
    const activeBackgroundTexture = mat.uniforms.u_texture.value as Texture;
    activeBackgroundTexture.needsUpdate = true;

    applyLayerUniforms(mat, "L0", le.background, baseTime);
    applyLayerUniforms(mat, "L1", le.decal, baseTime);

    const uploadedDecal = decalTexture;
    const decalTex = uploadedDecal ?? transparentFallbackTexture;
    mat.uniforms.u_decalTexture.value = decalTex;
    const activeDecalTexture = mat.uniforms.u_decalTexture.value as Texture;
    activeDecalTexture.needsUpdate = true;
    mat.uniforms.u_decalTransform.value.set(
      synth.decalOffsetX,
      synth.decalOffsetY,
      synth.decalScale,
    );
    mat.uniforms.u_linkDecalToMath.value = synth.linkDecalToMath ? 1.0 : 0.0;

    const hasUploadedDecal = uploadedDecal != null;
    const linkTextUniform = hasUploadedDecal
      ? synth.linkTextToMath
        ? 1.0
        : 0.0
      : synth.linkDecalToMath
        ? 1.0
        : 0.0;
    mat.uniforms.u_linkTextToMath.value = linkTextUniform;

    for (let i = 0; i < MAX_TEXT_LAYERS; i++) {
      const prefix = TEXT_PREFIXES[i];
      const layer = layers[i];
      const params = layer
        ? resolveTextLayerEffects(layer, le.text, tfx)
        : le.text;
      applyLayerUniforms(mat, prefix, params, baseTime);

      const slotTex = textTextureRefs.current[i];
      const trimmed = layer?.text.trim() ?? "";
      const active = layer && trimmed.length > 0 ? 1.0 : 0.0;
      mat.uniforms[`u_textActive${i}`].value = active;
      mat.uniforms[`u_textSlot${i}`].value =
        active > 0.5
          ? (slotTex ?? transparentFallbackTexture)
          : transparentFallbackTexture;
      if (slotTex) {
        slotTex.needsUpdate = true;
      }

      let ox = 0;
      let oy = 0;
      let sc = 1;
      if (layer) {
        if (hasUploadedDecal) {
          ox = layer.offsetX;
          oy = layer.offsetY;
          sc = layer.scale;
        } else {
          ox = synth.decalOffsetX;
          oy = synth.decalOffsetY;
          sc = synth.decalScale;
        }
      }
      mat.uniforms[`u_textTransform${i}`].value.set(ox, oy, sc);
    }

    const controlledReveal = introEnabled
      ? Math.max(0, Math.min(1, revealProgress))
      : 1;
    mat.uniforms.u_bootReveal.value = controlledReveal;
    mat.uniforms.u_introProgress.value = controlledReveal;
  });

  return (
    <shaderMaterial
      ref={materialRef}
      toneMapped={false}
      depthWrite={false}
      vertexShader={synthVertexShader}
      fragmentShader={synthFragmentShader}
      uniforms={uniforms}
    />
  );
}
