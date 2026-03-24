"use client";

import { DynamicSceneWrapper } from "@/components/3d/DynamicSceneWrapper";
import { SceneDemo } from "@/components/3d/SceneDemo";
import { heroFraming } from "@/components/3d/hero-framing";
import { siteConfig } from "../../../site.config";

import { HeroCrosshair } from "./HeroCrosshair";

export function HomeHero() {
  const { background, acidAccent } = siteConfig.colors;

  return (
    <>
      <DynamicSceneWrapper
        className="touch-none"
        cameraPosition={[...heroFraming.cameraPosition]}
        fov={heroFraming.fov}
        lookAt={[...heroFraming.lookAt]}
        model={{ ...heroFraming.model }}
        interaction={siteConfig.hero3d}
      >
        <SceneDemo accentColor={acidAccent} backgroundColor={background} />
      </DynamicSceneWrapper>
      <HeroCrosshair accentColor={acidAccent} />
    </>
  );
}
