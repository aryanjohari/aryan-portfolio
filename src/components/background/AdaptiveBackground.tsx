"use client";

import dynamic from "next/dynamic";

import { usePrefersWideViewport } from "@/hooks/usePrefersWideViewport";

import { StaticDarkBackground } from "./StaticDarkBackground";

const WebGLBackground = dynamic(() => import("./WebGLBackground"), {
  ssr: false,
});

export function AdaptiveBackground() {
  const isWide = usePrefersWideViewport();

  return (
    <>
      {!isWide ? <StaticDarkBackground /> : null}
      {isWide ? <WebGLBackground /> : null}
    </>
  );
}
