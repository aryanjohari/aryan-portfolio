"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import type { Hero3dSettings } from "../../../site.config";
import { siteConfig } from "../../../site.config";

import type { ModelLayoutProps } from "./hero-framing";

function SceneLoadingPlaceholder() {
  return (
    <div
      className="fixed inset-0 z-0 h-dvh w-full min-h-0 bg-background"
      aria-busy="true"
      aria-label="Loading 3D scene"
    />
  );
}

const SceneWrapperClient = dynamic(
  () => import("./SceneWrapper").then((m) => m.SceneWrapper),
  { loading: SceneLoadingPlaceholder, ssr: false },
);

export type DynamicSceneWrapperProps = {
  children?: ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  lookAt?: [number, number, number];
  model?: ModelLayoutProps;
  /** Defaults to `siteConfig.hero3d` */
  interaction?: Hero3dSettings;
};

/**
 * Always import this wrapper (not `./SceneWrapper`) from pages, layouts, or
 * server components so the canvas loads with `ssr: false` and does not block
 * the main thread during initial HTML/JS parse.
 */
export function DynamicSceneWrapper({
  children,
  className,
  cameraPosition,
  fov,
  lookAt,
  model,
  interaction = siteConfig.hero3d,
}: DynamicSceneWrapperProps) {
  const canvasClassName = ["absolute inset-0 h-full w-full", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="fixed inset-0 z-0 h-dvh w-full min-h-0">
      <SceneWrapperClient
        className={canvasClassName}
        cameraPosition={cameraPosition}
        fov={fov}
        lookAt={lookAt}
        model={model}
        interaction={interaction}
      >
        {children}
      </SceneWrapperClient>
    </div>
  );
}
