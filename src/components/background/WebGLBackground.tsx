"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

import {
  disposeHydratedTextures,
  type HydratedSynthPreset,
  hydrateSynthPreset,
} from "@/lib/synth/hydratePreset";
import type { SynthPreset } from "@/lib/synth/types";

import { PresetSynthScene } from "./PresetSynthScene";

function isSynthPreset(x: unknown): x is SynthPreset {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.presetSchemaVersion === "number" &&
    o.synth !== undefined &&
    o.layerEffects !== undefined &&
    o.imageResolution !== undefined &&
    o.assets !== undefined
  );
}

export default function WebGLBackground() {
  const [hydrated, setHydrated] = useState<HydratedSynthPreset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef<HydratedSynthPreset | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/bg.json");
        if (!res.ok) {
          throw new Error(`Failed to load preset: ${res.status}`);
        }
        const json: unknown = await res.json();
        if (!isSynthPreset(json)) {
          throw new Error("Invalid bg.json shape");
        }
        if (json.presetSchemaVersion !== 1) {
          console.warn(
            "[WebGLBackground] presetSchemaVersion is not 1; hydration may be incomplete",
          );
        }
        const h = await hydrateSynthPreset(json);
        if (cancelled) {
          disposeHydratedTextures(h);
          return;
        }
        hydratedRef.current = h;
        setHydrated(h);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load synth preset");
        }
      }
    })();

    return () => {
      cancelled = true;
      const h = hydratedRef.current;
      if (h) {
        disposeHydratedTextures(h);
        hydratedRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 h-full min-h-dvh w-full bg-[#0c1528]" />
    );
  }

  if (!hydrated) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 h-full min-h-dvh w-full bg-[#0c1528]" />
    );
  }

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
        <PresetSynthScene hydrated={hydrated} />
      </Canvas>
    </div>
  );
}
