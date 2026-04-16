"use client";

import { useThree } from "@react-three/fiber";

import type { HydratedSynthPreset } from "@/lib/synth/hydratePreset";

import { PresetSynthMaterial } from "./PresetSynthMaterial";

export function PresetSynthScene({ hydrated }: { hydrated: HydratedSynthPreset }) {
  const { preset, backgroundTexture, decalTexture } = hydrated;
  const { size } = useThree();
  const sx = size.width / 2;
  const sy = size.height / 2;

  return (
    <mesh position={[0, 0, 0]} scale={[sx, sy, 1]}>
      <planeGeometry args={[2, 2]} />
      <PresetSynthMaterial
        key={backgroundTexture.uuid}
        synth={preset.synth}
        layerEffects={preset.layerEffects}
        imageResolution={preset.imageResolution}
        backgroundTexture={backgroundTexture}
        decalTexture={decalTexture}
        initialTimeOffsetSeconds={preset.baseTimeSeconds ?? 0}
      />
    </mesh>
  );
}
