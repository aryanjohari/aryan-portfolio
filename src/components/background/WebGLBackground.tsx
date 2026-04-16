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
  if (
    typeof o.presetSchemaVersion !== "number" ||
    o.synth === null ||
    typeof o.synth !== "object" ||
    o.layerEffects === null ||
    typeof o.layerEffects !== "object" ||
    o.imageResolution === null ||
    typeof o.imageResolution !== "object" ||
    o.assets === null ||
    typeof o.assets !== "object"
  ) {
    return false;
  }
  const ver = o.presetSchemaVersion;
  const synth = o.synth as Record<string, unknown>;
  if (ver === 1) {
    return typeof synth.overlayText === "string";
  }
  if (ver === 2) {
    return Array.isArray(synth.textLayers);
  }
  return false;
}

type WebGLBackgroundProps = {
  revealProgress?: number;
  introEnabled?: boolean;
  onHydratedChange?: (ready: boolean) => void;
};

export default function WebGLBackground({
  revealProgress = 1,
  introEnabled = false,
  onHydratedChange,
}: WebGLBackgroundProps) {
  const [hydrated, setHydrated] = useState<HydratedSynthPreset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef<HydratedSynthPreset | null>(null);

  useEffect(() => {
    let cancelled = false;
    onHydratedChange?.(false);

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
        if (json.presetSchemaVersion !== 1 && json.presetSchemaVersion !== 2) {
          console.warn(
            "[WebGLBackground] presetSchemaVersion is not 1 or 2; rendering may be incomplete",
          );
        }
        const h = await hydrateSynthPreset(json);
        if (cancelled) {
          disposeHydratedTextures(h);
          return;
        }
        hydratedRef.current = h;
        setHydrated(h);
        onHydratedChange?.(true);
      } catch (e) {
        if (!cancelled) {
          onHydratedChange?.(false);
          setError(
            e instanceof Error ? e.message : "Failed to load synth preset",
          );
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
      onHydratedChange?.(false);
    };
  }, [onHydratedChange]);

  if (error) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 h-full min-h-dvh w-full bg-black" />
    );
  }

  if (!hydrated) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 h-full min-h-dvh w-full bg-black" />
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
          gl.setClearColor("#000000", 1);
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <PresetSynthScene
          hydrated={hydrated}
          revealProgress={revealProgress}
          introEnabled={introEnabled}
        />
      </Canvas>
    </div>
  );
}
