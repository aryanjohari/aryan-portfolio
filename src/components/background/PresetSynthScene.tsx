"use client";

import { useThree } from "@react-three/fiber";

import type { HydratedSynthPreset } from "@/lib/synth/hydratePreset";

import { PresetSynthMaterial } from "./PresetSynthMaterial";

type PresetSynthSceneProps = {
  hydrated: HydratedSynthPreset;
  revealProgress?: number;
  introEnabled?: boolean;
};

export function PresetSynthScene({
  hydrated,
  revealProgress = 1,
  introEnabled = false,
}: PresetSynthSceneProps) {
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
        revealProgress={revealProgress}
        introEnabled={introEnabled}
      />
    </mesh>
  );
}
