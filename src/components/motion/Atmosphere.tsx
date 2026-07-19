"use client";

import { useEffect, useRef, useState } from "react";

import { canUseEnhancedMotion } from "@/lib/motion";

/** Near `--color-bg` (#f4f0e8) — scaffold clear colour only, not a redesign. */
const CLEAR = 0xf4f0e8;

/**
 * Full-viewport fixed WebGL canvas behind content.
 * Mounts only when `canUseEnhancedMotion()` passes; otherwise null.
 * Scaffold: empty scene + faint points; visuals come later.
 */
export function Atmosphere() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(canUseEnhancedMotion());

    const mqDesktop = window.matchMedia("(min-width: 1024px)");
    const mqPointer = window.matchMedia("(pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => setActive(canUseEnhancedMotion());
    mqDesktop.addEventListener("change", sync);
    mqPointer.addEventListener("change", sync);
    mqMotion.addEventListener("change", sync);

    return () => {
      mqDesktop.removeEventListener("change", sync);
      mqPointer.removeEventListener("change", sync);
      mqMotion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let renderer: import("three").WebGLRenderer | undefined;
    let geometry: import("three").BufferGeometry | undefined;
    let material: import("three").PointsMaterial | undefined;
    let onResize: (() => void) | undefined;
    let onVisibility: (() => void) | undefined;

    void (async () => {
      const THREE = await import("three");
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
      renderer.setClearColor(CLEAR, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);

      const count = 24;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < positions.length; i++) {
        positions[i] = (Math.random() - 0.5) * 6;
      }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      material = new THREE.PointsMaterial({
        color: 0x0a0a0a,
        size: 0.03,
        opacity: 0.12,
        transparent: true,
        depthWrite: false,
      });
      scene.add(new THREE.Points(geometry, material));

      const resize = () => {
        if (!renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      resize();

      const tick = () => {
        if (disposed || !renderer) return;
        raf = requestAnimationFrame(tick);
        if (document.hidden) return;
        renderer.render(scene, camera);
      };

      onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else if (!raf) {
          tick();
        }
      };

      onResize = resize;
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      tick();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener("resize", onResize);
      if (onVisibility) {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      geometry?.dispose();
      material?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    />
  );
}
