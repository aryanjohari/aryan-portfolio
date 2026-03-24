"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useThree, type RootState } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, type ReactNode } from "react";

import type { Hero3dSettings } from "../../../site.config";
import { siteConfig } from "../../../site.config";

import { Model } from "./Avatar";
import type { ModelLayoutProps } from "./hero-framing";

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 1.5, 4];
const DEFAULT_FOV = 45;
const DEFAULT_LOOK_AT: [number, number, number] = [0, 1.1, 0];

type SceneWrapperProps = {
  children?: ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  lookAt?: [number, number, number];
  model?: ModelLayoutProps;
  interaction?: Hero3dSettings;
};

function CinematicLookAt({ target }: { target: [number, number, number] }) {
  const { camera } = useThree();
  const [tx, ty, tz] = target;
  useLayoutEffect(() => {
    camera.lookAt(tx, ty, tz);
  }, [camera, tx, ty, tz]);
  return null;
}

/**
 * Base R3F canvas. For routes and layouts, import `DynamicSceneWrapper` instead
 * so Three/WebGL is not loaded on the server or in the main SSR bundle.
 */
export function SceneWrapper({
  children,
  className,
  cameraPosition = DEFAULT_CAMERA_POSITION,
  fov = DEFAULT_FOV,
  lookAt = DEFAULT_LOOK_AT,
  model,
  interaction = siteConfig.hero3d,
}: SceneWrapperProps) {
  const useViewportPointer = interaction.pointerScope === "viewport";

  const eventSource = useMemo(() => {
    if (!useViewportPointer || typeof document === "undefined") return undefined;
    return document.documentElement;
  }, [useViewportPointer]);

  const onCreated = useMemo(
    () =>
      useViewportPointer
        ? (state: RootState) => {
            state.setEvents({
              compute: (event, threeState) => {
                const canvas = threeState.gl.domElement;
                const r = canvas.getBoundingClientRect();
                const w = Math.max(r.width, 1);
                const h = Math.max(r.height, 1);
                const x = ((event.clientX - r.left) / w) * 2 - 1;
                const y = -((event.clientY - r.top) / h) * 2 + 1;
                threeState.pointer.set(x, y);
                threeState.raycaster.setFromCamera(
                  threeState.pointer,
                  threeState.camera,
                );
              },
            });
          }
        : undefined,
    [useViewportPointer],
  );

  return (
    <Canvas
      className={className ?? "absolute inset-0 z-0 h-full w-full"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      eventSource={eventSource}
      onCreated={onCreated}
    >
      <PerspectiveCamera makeDefault position={cameraPosition} fov={fov} />
      <CinematicLookAt target={lookAt} />
      <Suspense fallback={null}>
        {children}
        <Model
          {...model}
          framingTarget={model?.framingTarget ?? lookAt}
          interaction={interaction}
        />
      </Suspense>
    </Canvas>
  );
}
