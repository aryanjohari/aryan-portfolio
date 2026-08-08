"use client";

import { useEffect, useRef, useState } from "react";

import {
  BOOT_DONE_EVENT,
  canUseEnhancedMotion,
  canUseTheatreMotion,
  isBootDone,
} from "@/lib/motion";

/** Site void clear — matches :root `--color-bg` / BootField. */
const CLEAR = 0x0a0a0a;
const PEAK_ALPHA = 0.55;
const LIFE_MIN = 0.7;
const LIFE_MAX = 1.15;
const DEPTH_RECT_CACHE_MS = 120;
const DEPTH_PAD = 6;
const DEPTH_FEATHER = 20;
const DEPTH_RESPONSE = 18;
const DEPTH_SPAWN_WEIGHT = 0.72;
/** Soft comet head size in CSS pixels. */
const SIZE_HEAD = 38;
const SIZE_TAIL = 9;

/**
 * DOM content that should visually sit in front of the trail. The workshop
 * tablets have their own WebGL void shades; this maps the same depth cue to
 * regular site copy and controls without adding rectangular CSS panels.
 */
const DEPTH_CONTENT_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "blockquote",
  "li",
  "dt",
  "dd",
  "pre",
  "label",
  "input",
  "textarea",
  "button",
  "a",
  "[data-atmosphere-depth]",
].join(",");

const DENSE_TRAIL = {
  maxTrail: 200,
  sampleSpacing: 2.4,
  maxSamplesPerMove: 14,
} as const;

const LIGHT_TRAIL = {
  maxTrail: 90,
  sampleSpacing: 3.6,
  maxSamplesPerMove: 8,
} as const;

const RED = { r: 1, g: 70 / 255, b: 85 / 255 };
const BLUE = { r: 85 / 255, g: 130 / 255, b: 1 };

type TrailSlot = {
  x: number;
  y: number;
  age: number;
  life: number;
  t: number;
  alive: boolean;
  spawnAlpha: number;
  /** 0 = core, 1 = soft halo for body. */
  layer: number;
  /** Smoothed amount of DOM content in front of this particle. */
  depth: number;
};

type DepthRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function makeSoftGlowTexture(THREE: typeof import("three")) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.65)");
  g.addColorStop(0.55, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Full-viewport fixed WebGL canvas behind content (all routes).
 * Soft red↔blue comet trail when theatre motion + boot done; otherwise null.
 * Text and controls form a soft depth map: the sharp trail core recedes while
 * its halo remains visible, matching the workshop tablet shade treatment.
 * Touch and mouse both drive the trail via pointermove.
 */
export function Atmosphere() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [theatre, setTheatre] = useState(false);

  useEffect(() => {
    setTheatre(canUseTheatreMotion());

    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setTheatre(canUseTheatreMotion());
    mqMotion.addEventListener("change", sync);

    return () => {
      mqMotion.removeEventListener("change", sync);
    };
  }, []);

  const active = theatre;

  useEffect(() => {
    if (!active) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let renderer: import("three").WebGLRenderer | undefined;
    let geometry: import("three").BufferGeometry | undefined;
    let material: import("three").ShaderMaterial | undefined;
    let glowMap: import("three").CanvasTexture | null | undefined;
    let onResize: (() => void) | undefined;
    let onVisibility: (() => void) | undefined;
    let onPointerMove: ((e: PointerEvent) => void) | undefined;
    let onPointerUp: (() => void) | undefined;
    let onPointerLeave: (() => void) | undefined;
    let onPointerEnter: (() => void) | undefined;
    let onBootDone: (() => void) | undefined;

    void (async () => {
      const THREE = await import("three");
      if (disposed || !hostRef.current) return;

      const dense = canUseEnhancedMotion();
      const budget = dense ? DENSE_TRAIL : LIGHT_TRAIL;
      const maxTrail = budget.maxTrail;
      const sampleSpacing = budget.sampleSpacing;
      const maxSamplesPerMove = budget.maxSamplesPerMove;

      let allowTrail = isBootDone();
      let pathHue = 0;
      let lastDepthCache = 0;
      let depthRects: DepthRect[] = [];
      let viewW = 1;
      let viewH = 1;
      let lastTs = 0;
      let pointerInside = true;
      let nextSlot = 0;
      let hasLast = false;
      let lastX = 0;
      let lastY = 0;

      const slots: TrailSlot[] = Array.from({ length: maxTrail }, () => ({
        x: 0,
        y: 0,
        age: 0,
        life: LIFE_MIN,
        t: 0,
        alive: false,
        spawnAlpha: PEAK_ALPHA,
        layer: 0,
        depth: 0,
      }));

      const positions = new Float32Array(maxTrail * 3);
      const colors = new Float32Array(maxTrail * 3);
      const sizes = new Float32Array(maxTrail);
      const alphas = new Float32Array(maxTrail);

      const refreshDepthRects = (now: number) => {
        if (now - lastDepthCache < DEPTH_RECT_CACHE_MS) return;
        lastDepthCache = now;

        const shell = document.querySelector(".site-shell");
        if (!shell) {
          depthRects = [];
          return;
        }

        depthRects = Array.from(
          shell.querySelectorAll<HTMLElement>(DEPTH_CONTENT_SELECTOR),
        ).flatMap((el) => {
          if (el.classList.contains("visually-hidden")) return [];
          const rect = el.getBoundingClientRect();
          if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.bottom < -DEPTH_FEATHER ||
            rect.top > viewH + DEPTH_FEATHER ||
            rect.right < -DEPTH_FEATHER ||
            rect.left > viewW + DEPTH_FEATHER
          ) {
            return [];
          }
          return [
            {
              left: rect.left - DEPTH_PAD,
              top: rect.top - DEPTH_PAD,
              right: rect.right + DEPTH_PAD,
              bottom: rect.bottom + DEPTH_PAD,
            },
          ];
        });
      };

      const depthAt = (x: number, y: number) => {
        let depth = 0;
        for (const rect of depthRects) {
          const dx = Math.max(rect.left - x, 0, x - rect.right);
          const dy = Math.max(rect.top - y, 0, y - rect.bottom);
          if (dx > DEPTH_FEATHER || dy > DEPTH_FEATHER) continue;
          const distance = Math.hypot(dx, dy);
          if (distance >= DEPTH_FEATHER) continue;
          depth = Math.max(depth, 1 - distance / DEPTH_FEATHER);
          if (depth === 1) break;
        }
        return depth;
      };

      const spawnWeightAt = (clientX: number, clientY: number, now: number) => {
        refreshDepthRects(now);
        const depth = depthAt(clientX, clientY);
        return 1 - depth * (1 - DEPTH_SPAWN_WEIGHT);
      };

      const spawnOne = (
        x: number,
        y: number,
        weight: number,
        layer: number,
        ox = 0,
        oy = 0,
      ) => {
        if (weight < 1 && Math.random() > weight * 1.5) return;
        const slot = slots[nextSlot];
        nextSlot = (nextSlot + 1) % maxTrail;
        slot.x = x + ox;
        slot.y = y + oy;
        slot.age = 0;
        slot.life = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
        slot.t = (Math.sin(pathHue) + 1) * 0.5;
        slot.alive = true;
        slot.layer = layer;
        slot.depth = depthAt(slot.x, slot.y);
        slot.spawnAlpha =
          PEAK_ALPHA * Math.max(weight, 0.12) * (layer === 0 ? 1 : 0.45);
      };

      const spawnAt = (x: number, y: number, weight: number, nx = 0, ny = 0) => {
        // Core + soft body for comet thickness
        spawnOne(x, y, weight, 0);
        if (dense) {
          const spread = 4 + Math.random() * 5;
          spawnOne(x, y, weight, 1, nx * spread, ny * spread);
          spawnOne(x, y, weight, 1, -nx * spread * 0.7, -ny * spread * 0.7);
        } else {
          const spread = 3 + Math.random() * 3;
          spawnOne(x, y, weight, 1, nx * spread * 0.5, ny * spread * 0.5);
        }
      };

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 10);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
      renderer.setClearColor(CLEAR, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      const canvas = renderer.domElement;
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      host.appendChild(canvas);

      glowMap = makeSoftGlowTexture(THREE);

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

      material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: glowMap },
        },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aAlpha;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = color;
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aSize;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float glow = texture2D(uMap, gl_PointCoord).a;
            float a = glow * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      scene.add(new THREE.Points(geometry, material));

      const resize = () => {
        if (!renderer) return;
        viewW = window.innerWidth;
        viewH = Math.max(window.innerHeight, 1);
        camera.left = 0;
        camera.right = viewW;
        camera.top = 0;
        camera.bottom = viewH;
        camera.updateProjectionMatrix();
        renderer.setSize(viewW, viewH, false);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      };
      resize();

      const writeBuffers = () => {
        const dpr = renderer!.getPixelRatio();
        for (let i = 0; i < maxTrail; i++) {
          const s = slots[i];
          const i3 = i * 3;
          if (!s.alive) {
            positions[i3] = -1e6;
            positions[i3 + 1] = -1e6;
            positions[i3 + 2] = 0;
            colors[i3] = 0;
            colors[i3 + 1] = 0;
            colors[i3 + 2] = 0;
            sizes[i] = 0;
            alphas[i] = 0;
            continue;
          }
          // Ease: bright fat head → thin soft tail
          const u = s.age / s.life;
          const fade = 1 - u;
          const ease = fade * fade;
          const headness = Math.pow(fade, 0.55);
          const baseSize =
            SIZE_TAIL + (SIZE_HEAD - SIZE_TAIL) * headness;
          const layerScale = s.layer === 0 ? 1 : 1.65;
          const depthSize = 1 + s.depth * (s.layer === 0 ? 0.18 : 0.52);
          const depthAlpha = 1 - s.depth * (s.layer === 0 ? 0.68 : 0.22);
          sizes[i] = baseSize * layerScale * depthSize * dpr;
          alphas[i] = s.spawnAlpha * ease * depthAlpha;

          const r = RED.r + (BLUE.r - RED.r) * s.t;
          const g = RED.g + (BLUE.g - RED.g) * s.t;
          const b = RED.b + (BLUE.b - RED.b) * s.t;
          positions[i3] = s.x;
          positions[i3 + 1] = s.y;
          positions[i3 + 2] = 0;
          colors[i3] = r;
          colors[i3 + 1] = g;
          colors[i3 + 2] = b;
        }
        geometry!.getAttribute("position").needsUpdate = true;
        geometry!.getAttribute("color").needsUpdate = true;
        geometry!.getAttribute("aSize").needsUpdate = true;
        geometry!.getAttribute("aAlpha").needsUpdate = true;
      };

      const tick = (ts: number) => {
        if (disposed || !renderer) return;
        raf = requestAnimationFrame(tick);
        if (document.hidden || !allowTrail) return;

        const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
        lastTs = ts;
        refreshDepthRects(ts);
        const depthEase = 1 - Math.exp(-DEPTH_RESPONSE * dt);

        for (let i = 0; i < maxTrail; i++) {
          const s = slots[i];
          if (!s.alive) continue;
          s.depth += (depthAt(s.x, s.y) - s.depth) * depthEase;
          s.age += dt;
          if (s.age >= s.life) s.alive = false;
        }

        writeBuffers();
        renderer.render(scene, camera);
      };

      const startTrailLoop = () => {
        if (disposed || raf) return;
        lastTs = 0;
        raf = requestAnimationFrame(tick);
      };

      onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(raf);
          raf = 0;
          lastTs = 0;
        } else if (allowTrail && !raf) {
          startTrailLoop();
        }
      };

      onPointerMove = (e: PointerEvent) => {
        if (!allowTrail || document.hidden || !pointerInside) return;

        const x = e.clientX;
        const y = e.clientY;
        const weight = spawnWeightAt(x, y, performance.now());

        if (!hasLast) {
          hasLast = true;
          lastX = x;
          lastY = y;
          pathHue += 0.12;
          spawnAt(x, y, weight);
          return;
        }

        const dx = x - lastX;
        const dy = y - lastY;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.4) return;

        pathHue += dist * 0.01;
        const inv = 1 / dist;
        const nx = -dy * inv;
        const ny = dx * inv;
        const samples = Math.min(
          maxSamplesPerMove,
          Math.max(1, Math.ceil(dist / sampleSpacing)),
        );
        for (let i = 1; i <= samples; i++) {
          const u = i / samples;
          spawnAt(lastX + dx * u, lastY + dy * u, weight, nx, ny);
        }

        lastX = x;
        lastY = y;
      };

      onPointerUp = () => {
        hasLast = false;
      };

      onPointerLeave = () => {
        pointerInside = false;
        hasLast = false;
      };

      onPointerEnter = () => {
        pointerInside = true;
      };

      onBootDone = () => {
        allowTrail = true;
        if (renderer) renderer.render(scene, camera);
        startTrailLoop();
      };

      onResize = resize;
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true });
      window.addEventListener("pointercancel", onPointerUp, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      document.documentElement.addEventListener("pointerenter", onPointerEnter);

      renderer.render(scene, camera);

      if (allowTrail) {
        startTrailLoop();
      } else {
        window.addEventListener(BOOT_DONE_EVENT, onBootDone);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (onResize) window.removeEventListener("resize", onResize);
      if (onVisibility) {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (onPointerMove) {
        window.removeEventListener("pointermove", onPointerMove);
      }
      if (onPointerUp) {
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      }
      if (onPointerLeave) {
        document.documentElement.removeEventListener(
          "pointerleave",
          onPointerLeave,
        );
      }
      if (onPointerEnter) {
        document.documentElement.removeEventListener(
          "pointerenter",
          onPointerEnter,
        );
      }
      if (onBootDone) {
        window.removeEventListener(BOOT_DONE_EVENT, onBootDone);
      }
      glowMap?.dispose();
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
