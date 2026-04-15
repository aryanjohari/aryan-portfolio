"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  backgroundFragmentShader,
  backgroundVertexShader,
} from "@/shaders/background";

const BACKGROUND_IMAGE_URL = "/test.png";

/** 0 = none, ~0.5 = visible drip, 1 = strong melt */
const MELT_INTENSITY = 0.72;

function BackgroundScene() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { size, clock } = useThree();
  const loaded = useLoader(THREE.TextureLoader, BACKGROUND_IMAGE_URL);
  const map = useMemo(() => {
    const t = loaded.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }, [loaded]);

  useEffect(() => {
    return () => {
      map.dispose();
    };
  }, [map]);

  const imageResolution = useMemo(() => {
    const img = map.image as HTMLImageElement | ImageBitmap;
    const w = "width" in img ? img.width : (img as ImageBitmap).width;
    const h = "height" in img ? img.height : (img as ImageBitmap).height;
    return new THREE.Vector2(Math.max(w, 1), Math.max(h, 1));
  }, [map]);

  const uniforms = useMemo(
    () => ({
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_imageResolution: { value: imageResolution.clone() },
      u_map: { value: map },
      u_meltIntensity: { value: MELT_INTENSITY },
      u_time: { value: 0 },
    }),
    [map, imageResolution],
  );

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.u_resolution.value.set(size.width, size.height);
    mat.uniforms.u_time.value = clock.elapsedTime;
  });

  const sx = size.width / 2;
  const sy = size.height / 2;

  return (
    <mesh position={[0, 0, 0]} scale={[sx, sy, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        toneMapped={false}
        depthWrite={false}
        vertexShader={backgroundVertexShader}
        fragmentShader={backgroundFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function WebGLBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-full min-h-dvh w-full">
      <Canvas
        orthographic
        className="h-full w-full"
        camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.setClearColor("#0c1528", 1);
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <BackgroundScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
