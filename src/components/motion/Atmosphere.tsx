"use client";

import { useEffect, useRef } from "react";

import {
  BOOT_DONE_EVENT,
  canUseEnhancedMotion,
  canUseTheatreMotion,
  isBootDone,
  prefersReducedMotion,
} from "@/lib/motion";
import { MOTION } from "@/lib/motion-tokens";

const V = MOTION.void;
const CLEAR = V.clear;
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

function hexToRgb(hex: number) {
  return {
    r: ((hex >> 16) & 255) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255,
  };
}

/** Coarse / short / narrow → quieter void + lighter trail budget. */
function isLightVoidBudget() {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-height: 700px)").matches ||
    !window.matchMedia("(min-width: 1024px)").matches
  );
}

/**
 * Full-viewport fixed WebGL canvas behind content (all routes).
 * Cool-slate void presence (grain, bowl vignette, center wash, soft parallax
 * fog) so the stage reads with depth; red↔blue comet trail when theatre
 * motion + boot done. Text/controls depth-map the trail core.
 * Reduced-motion keeps static presence (no trail / drift / parallax).
 */
export function Atmosphere() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let renderer: import("three").WebGLRenderer | undefined;
    let voidGeometry: import("three").PlaneGeometry | undefined;
    let voidMaterial: import("three").ShaderMaterial | undefined;
    let trailGeometry: import("three").BufferGeometry | undefined;
    let trailMaterial: import("three").ShaderMaterial | undefined;
    let glowMap: import("three").CanvasTexture | null | undefined;
    let onResize: (() => void) | undefined;
    let onVisibility: (() => void) | undefined;
    let onPointerMove: ((e: PointerEvent) => void) | undefined;
    let onPointerUp: (() => void) | undefined;
    let onPointerLeave: (() => void) | undefined;
    let onPointerEnter: (() => void) | undefined;
    let onBootDone: (() => void) | undefined;
    let onMotionChange: (() => void) | undefined;
    let mqMotion: MediaQueryList | undefined;

    void (async () => {
      const THREE = await import("three");
      if (disposed || !hostRef.current) return;

      let reduced = prefersReducedMotion();
      let theatre = canUseTheatreMotion();
      let dense = canUseEnhancedMotion();
      let lightVoid = isLightVoidBudget();

      const base = hexToRgb(CLEAR);
      const overlay = hexToRgb(V.overlay);
      const deep = hexToRgb(V.deep);
      let allowTrail = theatre && isBootDone();
      let pathHue = 0;
      let lastDepthCache = 0;
      let depthRects: DepthRect[] = [];
      let viewW = 1;
      let viewH = 1;
      let lastTs = 0;
      let elapsed = 0;
      let pointerInside = true;
      let nextSlot = 0;
      let hasLast = false;
      let lastX = 0;
      let lastY = 0;
      /** Smoothed pointer NDC offset for fog parallax (−1…1). */
      let ptrX = 0;
      let ptrY = 0;
      let ptrTX = 0;
      let ptrTY = 0;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 10);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
      renderer.setClearColor(CLEAR, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, V.dprCap));
      const canvas = renderer.domElement;
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      host.appendChild(canvas);

      const voidUniforms = {
        uBase: { value: new THREE.Vector3(base.r, base.g, base.b) },
        uOverlay: {
          value: new THREE.Vector3(overlay.r, overlay.g, overlay.b),
        },
        uDeep: { value: new THREE.Vector3(deep.r, deep.g, deep.b) },
        uGrainOpacity: {
          value: lightVoid ? V.grainOpacityLight : V.grainOpacity,
        },
        uGrainScale: {
          value: lightVoid ? V.grainScaleLight : V.grainScale,
        },
        uVignette: { value: lightVoid ? V.vignetteLight : V.vignette },
        uVignetteSoft: { value: V.vignetteSoft },
        uWash: { value: lightVoid ? V.washLight : V.wash },
        uFog: { value: lightVoid ? V.fogLight : V.fog },
        uFogScale: { value: lightVoid ? V.fogScaleLight : V.fogScale },
        uParallax: {
          value: (lightVoid ? V.parallaxLight : V.parallax) as number,
        },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uBreatheAmp: { value: reduced ? 0 : V.breatheAmp },
        uBreatheHz: { value: V.breatheHz },
        uDriftSpeed: { value: reduced ? 0 : V.driftSpeed },
        uResolution: { value: new THREE.Vector2(1, 1) },
      };

      voidGeometry = new THREE.PlaneGeometry(1, 1);
      voidMaterial = new THREE.ShaderMaterial({
        uniforms: voidUniforms,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uBase;
          uniform vec3 uOverlay;
          uniform vec3 uDeep;
          uniform float uGrainOpacity;
          uniform float uGrainScale;
          uniform float uVignette;
          uniform float uVignetteSoft;
          uniform float uWash;
          uniform float uFog;
          uniform float uFogScale;
          uniform float uParallax;
          uniform vec2 uPointer;
          uniform float uTime;
          uniform float uBreatheAmp;
          uniform float uBreatheHz;
          uniform float uDriftSpeed;
          uniform vec2 uResolution;
          varying vec2 vUv;

          float hash(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }

          float valueNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }

          void main() {
            float breathe =
              1.0 + uBreatheAmp * sin(uTime * 6.28318530718 * uBreatheHz);

            vec2 vc = vUv * 2.0 - 1.0;
            float aspect = uResolution.x / max(uResolution.y, 1.0);
            vc.x *= aspect;
            float r = length(vc);

            // Soft center wash + bowl vignette (edges sink to deep cool)
            float center = 1.0 - smoothstep(0.0, 0.95, r);
            float vig = smoothstep(uVignetteSoft, 1.28, r) * uVignette;
            vec3 col = mix(uBase, uOverlay * breathe, uWash * center);
            col = mix(col, uDeep, vig);

            // Soft multi-layer fog — parallax opposite the pointer
            vec2 anti = -uPointer * uParallax;
            float fog =
              valueNoise((vUv + anti * 0.55) * uFogScale + vec2(uTime * 0.012, 0.0)) * 0.5 +
              valueNoise((vUv + anti * 1.1) * uFogScale * 1.85 + 7.3) * 0.32 +
              valueNoise((vUv + anti * 1.85) * uFogScale * 3.1 + 19.0) * 0.18;
            fog = smoothstep(0.28, 0.82, fog) * uFog * (0.55 + 0.45 * center);
            col = mix(col, uOverlay * (0.92 + 0.08 * breathe), fog);

            // Film grain — cool-slate speck drifted in pixel space
            vec2 drift = vec2(uTime * uDriftSpeed * 0.37, uTime * uDriftSpeed * 0.21);
            vec2 gUv = (gl_FragCoord.xy + drift) * uGrainScale;
            float n = valueNoise(gUv);
            n = mix(n, valueNoise(gUv * 2.13 + 17.0), 0.32);
            float grain = (n - 0.5) * uGrainOpacity;
            col += uOverlay * grain;

            gl_FragColor = vec4(col, 1.0);
          }
        `,
        // Atmosphere ortho uses top=0, bottom=viewH (DOM Y-down). That flips
        // winding so a FrontSide PlaneGeometry is back-face culled — only the
        // clear color + trail would show. DoubleSide keeps the void quad drawn.
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
      });
      const voidMesh = new THREE.Mesh(voidGeometry, voidMaterial);
      voidMesh.position.z = -1;
      voidMesh.frustumCulled = false;
      scene.add(voidMesh);

      // Trail resources — sized for current budget; rebuilt if gate flips
      let budget = dense ? DENSE_TRAIL : LIGHT_TRAIL;
      let maxTrail = theatre ? budget.maxTrail : 0;
      let sampleSpacing = budget.sampleSpacing;
      let maxSamplesPerMove = budget.maxSamplesPerMove;

      let slots: TrailSlot[] = [];
      let positions = new Float32Array(0);
      let colors = new Float32Array(0);
      let sizes = new Float32Array(0);
      let alphas = new Float32Array(0);
      let points: import("three").Points | undefined;

      const syncVoidBudget = () => {
        lightVoid = isLightVoidBudget();
        voidUniforms.uGrainOpacity.value = lightVoid
          ? V.grainOpacityLight
          : V.grainOpacity;
        voidUniforms.uGrainScale.value = lightVoid
          ? V.grainScaleLight
          : V.grainScale;
        voidUniforms.uVignette.value = lightVoid ? V.vignetteLight : V.vignette;
        voidUniforms.uWash.value = lightVoid ? V.washLight : V.wash;
        voidUniforms.uFog.value = lightVoid ? V.fogLight : V.fog;
        voidUniforms.uFogScale.value = lightVoid
          ? V.fogScaleLight
          : V.fogScale;
        voidUniforms.uParallax.value = reduced
          ? 0
          : lightVoid
            ? V.parallaxLight
            : V.parallax;
        voidUniforms.uBreatheAmp.value = reduced ? 0 : V.breatheAmp;
        voidUniforms.uDriftSpeed.value = reduced ? 0 : V.driftSpeed;
        if (reduced) {
          ptrX = 0;
          ptrY = 0;
          ptrTX = 0;
          ptrTY = 0;
          voidUniforms.uPointer.value.set(0, 0);
        }
      };

      const disposeTrail = () => {
        if (points) {
          scene.remove(points);
          points = undefined;
        }
        trailGeometry?.dispose();
        trailGeometry = undefined;
        trailMaterial?.dispose();
        trailMaterial = undefined;
        glowMap?.dispose();
        glowMap = undefined;
        slots = [];
        positions = new Float32Array(0);
        colors = new Float32Array(0);
        sizes = new Float32Array(0);
        alphas = new Float32Array(0);
        maxTrail = 0;
        nextSlot = 0;
        hasLast = false;
      };

      const buildTrail = () => {
        disposeTrail();
        if (!theatre) return;

        dense = canUseEnhancedMotion();
        budget = dense ? DENSE_TRAIL : LIGHT_TRAIL;
        maxTrail = budget.maxTrail;
        sampleSpacing = budget.sampleSpacing;
        maxSamplesPerMove = budget.maxSamplesPerMove;

        slots = Array.from({ length: maxTrail }, () => ({
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
        positions = new Float32Array(maxTrail * 3);
        colors = new Float32Array(maxTrail * 3);
        sizes = new Float32Array(maxTrail);
        alphas = new Float32Array(maxTrail);

        glowMap = makeSoftGlowTexture(THREE);
        trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        trailGeometry.setAttribute(
          "color",
          new THREE.BufferAttribute(colors, 3),
        );
        trailGeometry.setAttribute(
          "aSize",
          new THREE.BufferAttribute(sizes, 1),
        );
        trailGeometry.setAttribute(
          "aAlpha",
          new THREE.BufferAttribute(alphas, 1),
        );

        trailMaterial = new THREE.ShaderMaterial({
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
        points = new THREE.Points(trailGeometry, trailMaterial);
        points.frustumCulled = false;
        scene.add(points);
      };

      if (theatre) buildTrail();

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
        if (maxTrail === 0 || slots.length === 0) return;
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

      const spawnAt = (
        x: number,
        y: number,
        weight: number,
        nx = 0,
        ny = 0,
      ) => {
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

        voidMesh.position.set(viewW * 0.5, viewH * 0.5, -1);
        voidMesh.scale.set(viewW, viewH, 1);
        voidUniforms.uResolution.value.set(viewW, viewH);
        syncVoidBudget();
      };
      resize();

      const writeBuffers = () => {
        if (!trailGeometry || maxTrail === 0) return;
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
          const u = s.age / s.life;
          const fade = 1 - u;
          const ease = fade * fade;
          const headness = Math.pow(fade, 0.55);
          const baseSize = SIZE_TAIL + (SIZE_HEAD - SIZE_TAIL) * headness;
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
        trailGeometry.getAttribute("position").needsUpdate = true;
        trailGeometry.getAttribute("color").needsUpdate = true;
        trailGeometry.getAttribute("aSize").needsUpdate = true;
        trailGeometry.getAttribute("aAlpha").needsUpdate = true;
      };

      const paint = () => {
        if (!renderer) return;
        voidUniforms.uTime.value = elapsed;
        voidUniforms.uPointer.value.set(ptrX, ptrY);
        writeBuffers();
        renderer.render(scene, camera);
      };

      const tick = (ts: number) => {
        if (disposed || !renderer) return;
        raf = requestAnimationFrame(tick);
        if (document.hidden) return;

        const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
        lastTs = ts;
        if (!reduced) elapsed += dt;

        if (!reduced) {
          const ease = 1 - Math.exp(-V.parallaxEase * dt);
          ptrX += (ptrTX - ptrX) * ease;
          ptrY += (ptrTY - ptrY) * ease;
        }

        if (allowTrail && maxTrail > 0) {
          refreshDepthRects(ts);
          const depthEase = 1 - Math.exp(-DEPTH_RESPONSE * dt);
          for (let i = 0; i < maxTrail; i++) {
            const s = slots[i];
            if (!s.alive) continue;
            s.depth += (depthAt(s.x, s.y) - s.depth) * depthEase;
            s.age += dt;
            if (s.age >= s.life) s.alive = false;
          }
        }

        paint();
      };

      const startLoop = () => {
        if (disposed || raf) return;
        lastTs = 0;
        raf = requestAnimationFrame(tick);
      };

      const stopLoop = () => {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTs = 0;
      };

      /**
       * Reduced-motion: static grain + vignette (no RAF).
       * Theatre: continuous loop for drift + trail aging.
       */
      const syncMotionMode = () => {
        reduced = prefersReducedMotion();
        const nextTheatre = canUseTheatreMotion();
        syncVoidBudget();

        if (nextTheatre !== theatre) {
          theatre = nextTheatre;
          if (theatre) {
            buildTrail();
            allowTrail = isBootDone();
          } else {
            disposeTrail();
            allowTrail = false;
          }
        }

        if (reduced) {
          stopLoop();
          elapsed = 0;
          paint();
        } else {
          startLoop();
        }
      };

      onVisibility = () => {
        if (document.hidden) {
          stopLoop();
        } else if (!reduced) {
          startLoop();
        } else {
          paint();
        }
      };

      onPointerMove = (e: PointerEvent) => {
        if (document.hidden || !pointerInside) return;

        const x = e.clientX;
        const y = e.clientY;

        if (!reduced) {
          ptrTX = (x / Math.max(viewW, 1)) * 2 - 1;
          ptrTY = (y / Math.max(viewH, 1)) * 2 - 1;
        }

        if (!allowTrail || maxTrail === 0) return;

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
        ptrTX = 0;
        ptrTY = 0;
      };

      onPointerEnter = () => {
        pointerInside = true;
      };

      onBootDone = () => {
        allowTrail = theatre;
        paint();
        if (!reduced) startLoop();
      };

      onResize = () => {
        resize();
        if (reduced || document.hidden) paint();
      };

      onMotionChange = () => {
        syncMotionMode();
      };

      if (disposed) return;

      mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      mqMotion.addEventListener("change", onMotionChange);

      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true });
      window.addEventListener("pointercancel", onPointerUp, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
      document.documentElement.addEventListener("pointerenter", onPointerEnter);

      paint();

      if (reduced) {
        // Static presence only — no loop
      } else {
        startLoop();
        if (!allowTrail) {
          window.addEventListener(BOOT_DONE_EVENT, onBootDone);
        }
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (mqMotion && onMotionChange) {
        mqMotion.removeEventListener("change", onMotionChange);
      }
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
      voidGeometry?.dispose();
      voidMaterial?.dispose();
      trailGeometry?.dispose();
      trailMaterial?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

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
