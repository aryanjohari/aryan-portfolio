"use client";

import { Environment } from "@react-three/drei";
import type { ReactNode } from "react";

type SceneDemoProps = {
  accentColor: string;
  backgroundColor: string;
  children?: ReactNode;
};

export function SceneDemo({
  accentColor,
  backgroundColor,
  children,
}: SceneDemoProps) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <Environment preset="city" />
      <ambientLight intensity={0.32} />
      <directionalLight
        color="#f5f5f5"
        intensity={1.45}
        position={[-7, 5, 3]}
      />
      <directionalLight intensity={0.4} position={[8, 3, 6]} />
      <pointLight
        position={[4.5, 2.5, 3]}
        intensity={2.6}
        color={accentColor}
        distance={26}
      />
      {children}
    </>
  );
}
