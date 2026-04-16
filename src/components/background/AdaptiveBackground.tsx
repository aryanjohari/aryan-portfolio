"use client";

import dynamic from "next/dynamic";

import { usePrefersWideViewport } from "@/hooks/usePrefersWideViewport";

import { MobileImageBackground } from "./MobileImageBackground";

const WebGLBackground = dynamic(() => import("./WebGLBackground"), {
  ssr: false,
});

type AdaptiveBackgroundProps = {
  revealProgress?: number;
  introEnabled?: boolean;
  onHydratedChange?: (ready: boolean) => void;
};

export function AdaptiveBackground({
  revealProgress = 1,
  introEnabled = false,
  onHydratedChange,
}: AdaptiveBackgroundProps) {
  const isWide = usePrefersWideViewport();

  return (
    <>
      {!isWide ? <MobileImageBackground /> : null}
      {isWide ? (
        <WebGLBackground
          revealProgress={revealProgress}
          introEnabled={introEnabled}
          onHydratedChange={onHydratedChange}
        />
      ) : null}
    </>
  );
}
