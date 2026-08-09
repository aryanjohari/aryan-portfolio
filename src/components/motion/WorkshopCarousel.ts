/**
 * Workshop edge-glow tablet carousel — self-contained Three.js stage.
 * Client-only: call after dynamic `import("three")` via createWorkshopCarousel.
 *
 * Visual model: each project is a light-drawn contour in the void — cream
 * typography floats on pure alpha inside a thin beveled rim, with front/back
 * plates nearly invisible at center and bright only at grazing silhouette
 * (Fresnel edge glow, not a literal wireframe). Atmosphere reads straight
 * through the body. No tinted fill, no colour splash, no transmission.
 *
 * Perf contract: render-on-demand only. Idle `/workshop` schedules ~0 RAF /
 * GPU frames after the last settle (drag, snap, hover ease, enter/exit, or
 * resize). Entrance: rim ignite + depth assemble; exit: short rim extinguish.
 */

import type { MOTION } from "@/lib/motion-tokens";

const CREAM = "#f4f0e8";
/** Landscape tablet footprint */
const FACE_W = 4.55;
const FACE_H = 2.9;
/** Volume depth — reads as a physical tablet when tilted */
const SLAB_THICKNESS = 0.72;
/** Content plane — type stays clear of the chipped rim */
const FACE_INSET = 0.88;
const CAMERA_FOV = 38;
const CAMERA_Z = 5.15;

export type WorkshopProjectCard = {
  slug: string;
  title: string;
  hook: string;
  missing: boolean;
  hue: number;
};

export type WorkshopCarouselHandle = {
  setIndex: (t: number) => void;
  getIndex: () => number;
  setHoverTilt: (x: number, y: number) => void;
  /** Pause pointer-driven breathe / light pull while dragging. */
  setDragging: (dragging: boolean) => void;
  /**
   * Rim ignite + depth assemble. Resolves when settled. Safe to call once
   * after mount; no-ops if already playing/ready.
   */
  playEnter: () => Promise<void>;
  /** Short rim extinguish while the canvas is still connected. */
  playExit: () => Promise<void>;
  resize: () => void;
  /** Raycast active slab under client coords; returns slug or null. */
  pick: (clientX: number, clientY: number) => string | null;
  dispose: () => void;
};

export type WorkshopCarouselOptions = {
  projects: WorkshopProjectCard[];
  enhanced: boolean;
  maxDpr: number;
  tokens: (typeof MOTION)["workshop"];
  /** Fired if the GL context is lost so the caller can show the DOM fallback. */
  onContextLost?: () => void;
};

type THREE = typeof import("three");

type SlabBundle = {
  group: import("three").Group;
  /** Near-black pane that quiets the Atmosphere trail behind the body */
  shade: import("three").Mesh;
  back: import("three").Mesh;
  rim: import("three").Mesh;
  content: import("three").Mesh;
  front: import("three").Mesh;
  texture: import("three").CanvasTexture;
  bumpMap: import("three").CanvasTexture;
  canvas: HTMLCanvasElement;
  slug: string;
  /** Quiet per-slug specular tint on the rim only */
  baseTint: import("three").Color;
  rimEnv: number;
  backFresnel: number;
  frontFresnel: number;
};

type Outline = Array<readonly [number, number]>;

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function slugSeed(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let lineCount = 0;
  let cy = y;

  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = words[i]!;
      cy += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        let rest = words.slice(i).join(" ");
        if (ctx.measureText(rest).width <= maxWidth) {
          ctx.fillText(rest, x, cy);
          return cy + lineHeight;
        }
        while (
          rest.length > 1 &&
          ctx.measureText(`${rest}…`).width > maxWidth
        ) {
          rest = rest.slice(0, -1);
        }
        ctx.fillText(`${rest}…`, x, cy);
        return cy + lineHeight;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

function tracePillPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
}

/**
 * Cream typography on pure alpha — title hero, hook, CTA pill on the
 * left; slug-hued visual placeholder pane on the right (same language as the
 * fallback cards). Stronger dark per-glyph halo keeps type legible on void.
 */
function paintFace(
  canvas: HTMLCanvasElement,
  card: WorkshopProjectCard,
  cssW: number,
  cssH: number,
  dpr: number,
): void {
  const w = Math.max(2, Math.round(cssW * dpr));
  const h = Math.max(2, Math.round(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padX = cssW * 0.07;
  const padY = cssH * 0.1;
  const hue = ((card.hue % 360) + 360) % 360;

  // Visual placeholder pane — right column, slug-hued void pane (swap the
  // fills for ctx.drawImage once real screenshots exist)
  const paneX = cssW * 0.63;
  const paneY = padY;
  const paneW = cssW - padX - paneX;
  const paneH = cssH - padY * 2;

  ctx.shadowColor = "transparent";
  ctx.fillStyle = `hsla(${hue}, 16%, 10%, 0.55)`;
  ctx.fillRect(paneX, paneY, paneW, paneH);

  const glow = ctx.createRadialGradient(
    paneX + paneW * 0.32,
    paneY + paneH * 0.26,
    0,
    paneX + paneW * 0.32,
    paneY + paneH * 0.26,
    Math.max(paneW, paneH) * 0.7,
  );
  glow.addColorStop(0, `hsla(${hue}, 18%, 26%, 0.8)`);
  glow.addColorStop(1, "hsla(0, 0%, 0%, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(paneX, paneY, paneW, paneH);

  ctx.strokeStyle = "rgba(244, 240, 232, 0.24)";
  ctx.lineWidth = 1;
  ctx.strokeRect(paneX + 0.5, paneY + 0.5, paneW - 1, paneH - 1);

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(244, 240, 232, 0.72)";
  ctx.font = `${Math.round(cssH * 0.048)}px ui-monospace, monospace`;
  ctx.fillText("preview", paneX + paneW / 2, paneY + paneH / 2);

  // Text column
  const colW = paneX - padX - cssW * 0.045;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Title — hero signal framed by edge light
  ctx.shadowColor = "rgba(3, 4, 7, 0.98)";
  ctx.shadowBlur = Math.max(8, cssH * 0.045);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, cssH * 0.006);
  ctx.fillStyle = CREAM;
  ctx.font = `600 ${Math.round(cssH * 0.112)}px ui-monospace, monospace`;
  let ty = padY;
  ty = wrapText(ctx, card.title, padX, ty, colW, cssH * 0.13, 2);

  // Hook
  ty += cssH * 0.04;
  ctx.fillStyle = card.missing
    ? "rgba(244, 240, 232, 0.78)"
    : "rgba(244, 240, 232, 0.94)";
  ctx.font = `${card.missing ? "italic " : ""}${Math.round(cssH * 0.06)}px ui-monospace, monospace`;
  wrapText(ctx, card.hook, padX, ty, colW, cssH * 0.078, 3);

  // CTA pill — 1px cream border, quiet, matches void chrome affordances
  const ctaFont = `${Math.round(cssH * 0.05)}px ui-monospace, monospace`;
  ctx.font = ctaFont;
  const ctaLabel = "open project \u2197";
  const ctaTextW = ctx.measureText(ctaLabel).width;
  const pillPadX = cssH * 0.055;
  const pillH = cssH * 0.108;
  const pillW = ctaTextW + pillPadX * 2;
  const pillX = padX;
  const pillY = cssH - padY - pillH;

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  tracePillPath(ctx, pillX, pillY, pillW, pillH);
  ctx.strokeStyle = "rgba(244, 240, 232, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.shadowColor = "rgba(3, 4, 7, 0.95)";
  ctx.shadowBlur = Math.max(4, cssH * 0.02);
  ctx.textBaseline = "middle";
  ctx.fillStyle = CREAM;
  ctx.fillText(ctaLabel, pillX + pillPadX, pillY + pillH / 2 + 0.5);

  ctx.textBaseline = "top";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Softly chipped rectangular silhouette — quiet craft, not irregular ice.
 * Seeded corner cuts stay subtle so tablets read as one family.
 */
function tabletOutline(seed: number): Outline {
  const hw = FACE_W / 2;
  const hh = FACE_H / 2;
  const chip = (i: number) => 0.07 + hash01(seed + i) * 0.08;
  const j = (i: number) => (hash01(seed + 40 + i) - 0.5) * 0.028;
  const tl = [chip(1), chip(2)] as const;
  const tr = [chip(3), chip(4)] as const;
  const br = [chip(5), chip(6)] as const;
  const bl = [chip(7), chip(8)] as const;

  return [
    [-hw + tl[0] + j(0), hh + j(1)],
    [hw - tr[0] + j(2), hh + j(3)],
    [hw - tr[0] * 0.35 + j(4), hh - tr[1] * 0.4 + j(5)],
    [hw + j(6), hh - tr[1] + j(7)],
    [hw + j(8), -hh + br[1] + j(9)],
    [hw - br[0] * 0.4 + j(10), -hh + br[1] * 0.35 + j(11)],
    [hw - br[0] + j(12), -hh + j(13)],
    [-hw + bl[0] + j(14), -hh + j(15)],
    [-hw + bl[0] * 0.35 + j(16), -hh + bl[1] * 0.4 + j(17)],
    [-hw + j(18), -hh + bl[1] + j(19)],
    [-hw + j(20), hh - tl[1] + j(21)],
    [-hw + tl[0] * 0.4 + j(22), hh - tl[1] * 0.35 + j(23)],
  ];
}

function insetOutline(pts: Outline, width: number): Outline {
  const sx = Math.max(0.1, (FACE_W / 2 - width) / (FACE_W / 2));
  const sy = Math.max(0.1, (FACE_H / 2 - width) / (FACE_H / 2));
  return pts.map(([x, y]) => [x * sx, y * sy] as const);
}

function pathFromOutline<T extends import("three").Path>(
  path: T,
  pts: Outline,
): T {
  path.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) {
    path.lineTo(pts[i]![0], pts[i]![1]);
  }
  path.closePath();
  return path;
}

function ensurePlanarUVs(
  THREE: THREE,
  geo: import("three").BufferGeometry,
): void {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const pos = geo.getAttribute("position");
  if (!bb || !pos) return;

  const spanX = Math.max(1e-6, bb.max.x - bb.min.x);
  const spanY = Math.max(1e-6, bb.max.y - bb.min.y);
  let uv = geo.getAttribute("uv") as import("three").BufferAttribute | null;
  if (!uv || uv.count !== pos.count) {
    uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    geo.setAttribute("uv", uv);
  }
  for (let vi = 0; vi < pos.count; vi++) {
    uv.setXY(
      vi,
      (pos.getX(vi) - bb.min.x) / spanX,
      (pos.getY(vi) - bb.min.y) / spanY,
    );
  }
  uv.needsUpdate = true;
}

function buildLayerGeometry(
  THREE: THREE,
  shape: import("three").Shape,
  depth: number,
  bevelThickness: number,
  bevelSize: number,
  bevelSegments: number,
  curveSegments: number,
  /** Smooth normals for continuous Fresnel silhouette (keep indexed). */
  smooth = true,
): import("three").BufferGeometry {
  const solid = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelOffset: 0,
    bevelSegments,
    curveSegments,
  });
  solid.center();

  let geo: import("three").BufferGeometry = solid;
  if (!smooth && solid.index) {
    geo = solid.toNonIndexed();
    solid.dispose();
  }
  geo.computeVertexNormals();
  ensurePlanarUVs(THREE, geo);
  return geo;
}

/**
 * Contour light — center stays empty; grazing angles bloom cream.
 * Dedicated shader (not EdgesGeometry): silhouette only, no face fill.
 */
function createFresnelEdgeMaterial(
  THREE: THREE,
  color: number,
  power: number,
  intensity: number,
): import("three").ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        vN = normalize( normalMatrix * normal );
        vV = normalize( -mvPosition.xyz );
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float edge = pow( 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) ), uPower );
        float alpha = edge * uIntensity;
        if ( alpha < 0.012 ) discard;
        gl_FragColor = vec4( uColor * ( 0.55 + 0.45 * edge ), alpha );
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  return mat;
}

/**
 * Soft rim boost — MeshPhysicalMaterial keeps clearcoat/env; Fresnel adds
 * a little extra silhouette bloom without a wireframe.
 */
function attachFresnelEdgeGlow(
  material: import("three").MeshPhysicalMaterial,
  power: number,
  intensity: number,
  emissiveBoost: number,
): void {
  const key = `fresnel-edge-${power.toFixed(2)}-${intensity.toFixed(2)}-${emissiveBoost.toFixed(2)}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEdgePower = { value: power };
    shader.uniforms.uEdgeIntensity = { value: intensity };
    shader.uniforms.uEdgeEmissive = { value: emissiveBoost };
    material.userData.shader = shader;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        /* glsl */ `
        uniform float uEdgePower;
        uniform float uEdgeIntensity;
        uniform float uEdgeEmissive;
        void main() {
        `,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        /* glsl */ `
        float edgeF = pow( 1.0 - abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) ), uEdgePower );
        float edgeAlpha = clamp( opacity + edgeF * uEdgeIntensity, 0.0, 1.0 );
        vec4 diffuseColor = vec4( diffuse, edgeAlpha );
        `,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `
        #include <emissivemap_fragment>
        float edgeE = pow( 1.0 - abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) ), uEdgePower );
        totalEmissiveRadiance += diffuse * edgeE * uEdgeEmissive;
        `,
      );
  };
  material.customProgramCacheKey = () => key;
}

/**
 * Subtle micro-facet bump — quiet grain on the rim only.
 */
function createGlassBumpMap(
  THREE: THREE,
  seed: number,
  size: number,
): import("three").CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.colorSpace = THREE.NoColorSpace;
    return empty;
  }

  const height = new Float32Array(size * size);
  const cell = (cx: number, cy: number, salt: number) =>
    hash01(seed + cx * 374761 + cy * 668265 + salt);

  let hMin = Infinity;
  let hMax = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      let h = 0;
      for (const [freq, amp, salt] of [
        [5, 0.5, 11],
        [11, 0.28, 29],
        [22, 0.12, 47],
      ] as const) {
        const fx = u * freq;
        const fy = v * freq;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const n00 = cell(x0, y0, salt);
        const n10 = cell(x0 + 1, y0, salt);
        const n01 = cell(x0, y0 + 1, salt);
        const n11 = cell(x0 + 1, y0 + 1, salt);
        const nx0 = n00 + (n10 - n00) * sx;
        const nx1 = n01 + (n11 - n01) * sx;
        h += (nx0 + (nx1 - nx0) * sy - 0.5) * amp;
      }
      height[y * size + x] = h;
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
  }

  const img = ctx.createImageData(size, size);
  const span = Math.max(1e-6, hMax - hMin);
  for (let i = 0; i < height.length; i++) {
    const g = ((height[i]! - hMin) / span) * 255;
    const o = i * 4;
    img.data[o] = g;
    img.data[o + 1] = g;
    img.data[o + 2] = g;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.15, 1.15);
  tex.needsUpdate = true;
  return tex;
}

/** Dark void → soft cream zenith + cool side glints for edge catchlights. */
function buildVoidEnvScene(THREE: THREE): {
  scene: import("three").Scene;
  dispose: () => void;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030406);

  const disposables: Array<{
    geometry: import("three").BufferGeometry;
    material: import("three").Material;
  }> = [];

  const addOrb = (
    color: number,
    radius: number,
    x: number,
    y: number,
    z: number,
    segs: number,
  ) => {
    const geometry = new THREE.SphereGeometry(
      radius,
      segs,
      Math.max(4, segs / 2),
    );
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    disposables.push({ geometry, material });
  };

  addOrb(0xfffdf7, 2.2, 0.2, 5.4, -1, 12);
  addOrb(0xd0e0f6, 1.15, -4.2, 1.4, 2.6, 10);
  addOrb(0xf4f0e8, 0.9, 3.8, -0.4, 3.2, 10);
  addOrb(0xffffff, 0.38, 4.4, 2.6, 1.4, 8);
  addOrb(0xffffff, 0.22, -3.2, 3.0, 2.0, 8);
  addOrb(0x0a0c10, 1.5, 0, -4.3, 0, 8);

  return {
    scene,
    dispose: () => {
      for (const d of disposables) {
        d.geometry.dispose();
        d.material.dispose();
      }
      disposables.length = 0;
    },
  };
}

function probeWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function canUseWorkshopWebGL(): boolean {
  return probeWebGL();
}

export async function createWorkshopCarousel(
  host: HTMLElement,
  options: WorkshopCarouselOptions,
): Promise<WorkshopCarouselHandle> {
  if (!probeWebGL()) {
    throw new Error("WebGL unavailable");
  }

  const THREE = await import("three");
  const { projects, enhanced, maxDpr, tokens, onContextLost } = options;

  let disposed = false;
  let raf = 0;
  let floatIndex = 0;
  let hoverX = 0;
  let hoverY = 0;
  let hoverTargetX = 0;
  let hoverTargetY = 0;
  let dragging = false;
  let onScreen = true;
  let dirty = true;
  /** 0 = extinguished / pre-enter; 1 = fully lit */
  let introRim = 0;
  let introContent = 0;
  /** 0 = stacked deep; 1 = rested coverflow */
  let introAssemble = 0;
  let introPhase: "pending" | "entering" | "ready" | "exiting" = "pending";
  let introRaf = 0;
  let introResolve: (() => void) | null = null;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 40);
  camera.position.set(0, 0.04, CAMERA_Z);

  const renderer = new THREE.WebGLRenderer({
    antialias: enhanced,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.background = "transparent";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const voidEnv = buildVoidEnvScene(THREE);
  const envTarget = pmrem.fromScene(voidEnv.scene, 0.025);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = enhanced
    ? tokens.envIntensityEnhanced
    : tokens.envIntensityDefault;
  voidEnv.dispose();
  pmrem.dispose();

  const root = new THREE.Group();
  scene.add(root);

  const hemi = new THREE.HemisphereLight(0xe8eef8, 0x050608, 0.14);
  scene.add(hemi);

  const keyBase = { x: 2.6, y: 3.1, z: 4.2 };
  const rimBase = { x: -3.8, y: 1.5, z: -2.4 };
  const key = new THREE.DirectionalLight(0xdce6f5, enhanced ? 0.62 : 0.45);
  key.position.set(keyBase.x, keyBase.y, keyBase.z);
  scene.add(key);

  const rimLight = new THREE.DirectionalLight(
    0xf4f0e8,
    enhanced ? 0.85 : 0.62,
  );
  rimLight.position.set(rimBase.x, rimBase.y, rimBase.z);
  scene.add(rimLight);

  if (enhanced) {
    const kick = new THREE.DirectionalLight(0xc8d6ea, 0.14);
    kick.position.set(0.4, -1.6, 2.6);
    scene.add(kick);
  }

  const bevelSegs = enhanced
    ? tokens.bevelSegmentsEnhanced
    : tokens.bevelSegmentsDefault;
  const curveSegs = enhanced
    ? tokens.curveSegmentsEnhanced
    : tokens.curveSegmentsDefault;
  const texCssW = enhanced ? tokens.texCssWEnhanced : tokens.texCssWDefault;
  const texCssH = enhanced ? tokens.texCssHEnhanced : tokens.texCssHDefault;
  const bevelThickness = enhanced
    ? tokens.bevelThicknessEnhanced
    : tokens.bevelThicknessDefault;
  const bevelSize = enhanced
    ? tokens.bevelSizeEnhanced
    : tokens.bevelSizeDefault;
  const bumpSize = enhanced
    ? tokens.bumpMapSizeEnhanced
    : tokens.bumpMapSizeDefault;
  const plateDepth = enhanced
    ? tokens.plateDepthEnhanced
    : tokens.plateDepthDefault;
  const rimEnvBase = enhanced
    ? tokens.rimEnvIntensityEnhanced
    : tokens.rimEnvIntensityDefault;
  const iridescence = enhanced ? tokens.iridescence : 0;
  const fresnelPower = tokens.fresnelPower;
  const fresnelIntensity = enhanced
    ? tokens.fresnelIntensityEnhanced
    : tokens.fresnelIntensityDefault;
  const fresnelEmissive = enhanced
    ? tokens.fresnelEmissiveEnhanced
    : tokens.fresnelEmissiveDefault;

  const plateSpan = plateDepth + bevelThickness * 2;
  const plateOffset = Math.max(
    plateSpan * 0.5,
    SLAB_THICKNESS * 0.5 - plateSpan * 0.5,
  );
  const rimBevel = Math.min(bevelSize, tokens.rimWidth * 0.32);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const slabs: SlabBundle[] = [];
  const pickables: import("three").Object3D[] = [];

  for (let i = 0; i < projects.length; i++) {
    const card = projects[i]!;
    const seed = slugSeed(card.slug);
    const outline = tabletOutline(seed);
    const bumpMap = createGlassBumpMap(THREE, seed, bumpSize);

    const plateShape = pathFromOutline(new THREE.Shape(), outline);
    const rimShape = pathFromOutline(new THREE.Shape(), outline);
    rimShape.holes.push(
      pathFromOutline(new THREE.Path(), insetOutline(outline, tokens.rimWidth)),
    );

    // Per-slug hue only tints rim specular — never a coloured fill
    const tint = new THREE.Color().setHSL(
      (200 + (card.hue % 40)) / 360,
      0.22,
      0.82,
    );
    const thickBias = (hash01(seed + 77) - 0.5) * 40;
    const iridRange: [number, number] = [
      tokens.iridescenceThicknessMin + thickBias,
      tokens.iridescenceThicknessMax + thickBias,
    ];

    // 0. Void shade — flat near-black pane at the rear of the volume. Because
    // the Workshop canvas composites over the Atmosphere canvas, this darkens
    // the trail *behind* the tablet so the stack reads as depth. Black, not
    // grey: it deepens toward the void instead of tinting the body.
    const shadeGeo = new THREE.ShapeGeometry(
      pathFromOutline(
        new THREE.Shape(),
        insetOutline(outline, tokens.rimWidth * 0.5),
      ),
      curveSegs,
    );
    const shadeMat = new THREE.MeshBasicMaterial({
      color: tokens.shadeColor,
      transparent: true,
      opacity: tokens.shadeOpacity,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.z = -plateOffset - 0.01;
    shade.userData.slug = card.slug;

    // 1. Back — Fresnel silhouette only (no fill)
    const backGeo = buildLayerGeometry(
      THREE,
      plateShape,
      plateDepth,
      bevelThickness,
      bevelSize,
      bevelSegs,
      curveSegs,
      true,
    );
    const backMat = createFresnelEdgeMaterial(
      THREE,
      tokens.backColor,
      fresnelPower,
      fresnelIntensity * 0.75,
    );
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.z = -plateOffset;
    back.userData.slug = card.slug;

    // 2. Rim — primary contour; only depth-writing layer
    const rimGeo = buildLayerGeometry(
      THREE,
      rimShape,
      Math.max(0.05, SLAB_THICKNESS - rimBevel * 2),
      rimBevel,
      rimBevel,
      bevelSegs,
      curveSegs,
      true,
    );
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: tokens.rimColor,
      roughness: tokens.rimRoughness,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: tokens.frontClearcoatRoughness,
      flatShading: false,
      bumpMap,
      bumpScale: tokens.rimBumpScale,
      envMapIntensity: rimEnvBase,
      specularIntensity: 2.1,
      specularColor: tint,
      emissive: new THREE.Color(0xf4f0e8),
      emissiveIntensity: tokens.rimEmissive,
      iridescence,
      iridescenceIOR: tokens.iridescenceIOR,
      iridescenceThicknessRange: iridRange,
      transparent: true,
      opacity: tokens.rimOpacity,
      depthWrite: true,
      side: THREE.FrontSide,
    });
    attachFresnelEdgeGlow(
      rimMat,
      fresnelPower * 0.85,
      fresnelIntensity * 0.35,
      fresnelEmissive * 0.4,
    );
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.userData.slug = card.slug;

    // 3. Content — cream type floating mid-volume on void
    const contentGeo = new THREE.PlaneGeometry(
      FACE_W * FACE_INSET,
      FACE_H * FACE_INSET,
    );
    const canvas = document.createElement("canvas");
    paintFace(canvas, card, texCssW, texCssH, 1);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;

    const contentMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const content = new THREE.Mesh(contentGeo, contentMat);
    content.position.z = tokens.contentZ;
    content.userData.slug = card.slug;

    // 4. Front — Fresnel silhouette only (no fill)
    const frontGeo = buildLayerGeometry(
      THREE,
      plateShape,
      plateDepth,
      bevelThickness,
      bevelSize,
      bevelSegs,
      curveSegs,
      true,
    );
    const frontMat = createFresnelEdgeMaterial(
      THREE,
      tokens.frontColor,
      fresnelPower,
      fresnelIntensity,
    );
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.z = plateOffset;
    front.userData.slug = card.slug;

    const group = new THREE.Group();
    group.add(shade, back, rimMesh, content, front);
    group.userData.slug = card.slug;
    root.add(group);

    pickables.push(front, content, rimMesh);
    slabs.push({
      group,
      shade,
      back,
      rim: rimMesh,
      content,
      front,
      texture,
      bumpMap,
      canvas,
      slug: card.slug,
      baseTint: tint.clone(),
      rimEnv: rimEnvBase,
      backFresnel: fresnelIntensity * 0.75,
      frontFresnel: fresnelIntensity,
    });
  }

  const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

  const hoverNeedsEase = () =>
    Math.abs(hoverTargetX - hoverX) > tokens.hoverTiltEpsilon ||
    Math.abs(hoverTargetY - hoverY) > tokens.hoverTiltEpsilon;

  const applyPointerLights = () => {
    if (dragging) {
      key.position.set(keyBase.x, keyBase.y, keyBase.z);
      rimLight.position.set(rimBase.x, rimBase.y, rimBase.z);
      return;
    }
    const pull = tokens.pointerLightPull;
    key.position.set(
      keyBase.x + hoverX * pull,
      keyBase.y + hoverY * pull * 0.7,
      keyBase.z,
    );
    rimLight.position.set(
      rimBase.x + hoverX * pull * 0.55,
      rimBase.y - hoverY * pull * 0.5,
      rimBase.z,
    );
  };

  const applyLayout = () => {
    const assemble = introAssemble;
    const spacing = THREE.MathUtils.lerp(
      tokens.spacing * tokens.enterSpacingFrac,
      tokens.spacing,
      assemble,
    );
    const zOffset = THREE.MathUtils.lerp(
      tokens.zOffset * tokens.enterZMul,
      tokens.zOffset,
      assemble,
    );
    const angleMul = THREE.MathUtils.lerp(tokens.enterAngleMul, 1, assemble);
    const maxA = tokens.coverflowAngle * (Math.PI / 180) * angleMul;
    const step = tokens.coverflowAngleStep * (Math.PI / 180) * angleMul;
    const nearest = Math.round(floatIndex);
    const hoverMag = Math.min(
      1,
      Math.hypot(hoverX, hoverY) / Math.max(1, tokens.hoverTiltMax),
    );
    const breathe =
      !dragging && hoverNeedsEase() && introPhase === "ready"
        ? Math.sin(performance.now() * 0.0022) * tokens.breatheAmp
        : 0;

    applyPointerLights();

    for (let i = 0; i < slabs.length; i++) {
      const slab = slabs[i]!;
      const d = i - floatIndex;
      const abs = Math.abs(d);
      const isActive = i === nearest;
      slab.group.position.x = d * spacing;
      slab.group.position.z =
        -abs * zOffset -
        (isActive ? (1 - assemble) * tokens.enterActiveZPush : 0);
      slab.group.position.y = 0;

      let rotY = THREE.MathUtils.clamp(-d * step, -maxA, maxA);
      let rotX = 0;
      if (isActive && !dragging) {
        rotY += (tokens.activeRestTiltY + hoverX) * (Math.PI / 180);
        rotX +=
          (tokens.activeRestTiltX + hoverY + breathe) * (Math.PI / 180);
      }
      slab.group.rotation.y = rotY;
      slab.group.rotation.x = rotX;

      // Painter order: far → near slabs; inside each: shade → back → rim →
      // type → front
      const base = Math.round((16 - Math.min(abs, 15)) * 5);
      slab.shade.renderOrder = base;
      slab.back.renderOrder = base + 1;
      slab.rim.renderOrder = base + 2;
      slab.content.renderOrder = base + 3;
      slab.front.renderOrder = base + 4;

      const shadeMat = slab.shade.material as import("three").MeshBasicMaterial;
      const rimMat = slab.rim.material as import("three").MeshPhysicalMaterial;
      const backMat = slab.back.material as import("three").ShaderMaterial;
      const frontMat = slab.front.material as import("three").ShaderMaterial;
      const contentMat = slab.content
        .material as import("three").MeshBasicMaterial;

      const boost = isActive ? 1 + hoverMag * tokens.pointerEnvBoost : 0.88;
      rimMat.envMapIntensity = slab.rimEnv * boost * introRim;

      if (isActive) {
        rimMat.specularIntensity = 2.45 + hoverMag * 0.7;
        rimMat.opacity = Math.min(0.95, tokens.rimOpacity * 1.15) * introRim;
        rimMat.emissiveIntensity =
          tokens.rimEmissive * (1.2 + hoverMag * 0.5) * introRim;
        rimMat.specularColor.copy(slab.baseTint);
        backMat.uniforms.uIntensity!.value = slab.backFresnel * introRim;
        frontMat.uniforms.uIntensity!.value =
          slab.frontFresnel * (1 + hoverMag * 0.2) * introRim;
        shadeMat.opacity = tokens.shadeOpacity * introRim;
      } else {
        rimMat.specularIntensity = 1.55;
        const edgeFade = Math.max(
          tokens.neighborGlassFloor,
          1 - abs * tokens.neighborGlassFade,
        );
        rimMat.opacity = tokens.rimOpacity * edgeFade * introRim;
        rimMat.emissiveIntensity =
          tokens.rimEmissive * 0.55 * edgeFade * introRim;
        rimMat.specularColor.copy(slab.baseTint);
        backMat.uniforms.uIntensity!.value =
          slab.backFresnel * edgeFade * introRim;
        frontMat.uniforms.uIntensity!.value =
          slab.frontFresnel * edgeFade * introRim;
        // Neighbors stay lighter so overlapping panes never stack to a wall
        shadeMat.opacity = tokens.shadeNeighborOpacity * edgeFade * introRim;
      }

      const contentBase =
        abs < 0.15
          ? 1
          : Math.max(
              tokens.neighborContentFloor,
              1 - abs * tokens.neighborContentFade,
            );
      contentMat.opacity = contentBase * introContent;
    }
  };

  const setPixelRatio = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    renderer.setPixelRatio(dpr);
    return dpr;
  };

  const renderFrame = () => {
    if (disposed) return;
    applyLayout();
    renderer.render(scene, camera);
    dirty = false;
  };

  const tick = () => {
    raf = 0;
    if (disposed) return;
    if (document.hidden || !onScreen) return;

    if (hoverNeedsEase()) {
      const k = tokens.hoverTiltEase;
      hoverX += (hoverTargetX - hoverX) * k;
      hoverY += (hoverTargetY - hoverY) * k;
      if (!hoverNeedsEase()) {
        hoverX = hoverTargetX;
        hoverY = hoverTargetY;
      }
      dirty = true;
    }

    if (dirty) renderFrame();

    // Keep looping while tilt is still settling
    if (hoverNeedsEase()) {
      raf = requestAnimationFrame(tick);
    }
  };

  const ensureLoop = () => {
    if (disposed || raf || document.hidden || !onScreen) return;
    raf = requestAnimationFrame(tick);
  };

  const requestRender = () => {
    dirty = true;
    if (raf) return;
    if (document.hidden || !onScreen) return;
    if (hoverNeedsEase()) ensureLoop();
    else renderFrame();
  };

  /**
   * Fit pass — dolly the camera so the active tablet occupies a target
   * fraction of the frame on any stage size (short wide desktop stages and
   * narrow mobile stages both stay framed, never cropped or looming).
   */
  const fitCamera = () => {
    const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
    const dForWidth =
      FACE_W / tokens.fitWidthFrac / (2 * tanHalf * camera.aspect);
    const dForHeight = FACE_H / tokens.fitHeightFrac / (2 * tanHalf);
    camera.position.z = THREE.MathUtils.clamp(
      Math.max(dForWidth, dForHeight),
      tokens.cameraZMin,
      tokens.cameraZMax,
    );
  };

  const resize = () => {
    if (disposed) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera();
    const dpr = setPixelRatio();
    renderer.setSize(w, h, false);

    const texDpr = Math.min(dpr, 2);
    for (let i = 0; i < slabs.length; i++) {
      const slab = slabs[i]!;
      const card = projects[i]!;
      paintFace(slab.canvas, card, texCssW, texCssH, texDpr);
      slab.texture.needsUpdate = true;
    }
    requestRender();
  };

  const onVisibility = () => {
    if (document.hidden) {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    } else {
      requestRender();
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      if (onScreen) requestRender();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { threshold: 0.05 },
  );
  io.observe(host);

  const onLost = (event: Event) => {
    event.preventDefault();
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    onScreen = false;
    onContextLost?.();
  };
  renderer.domElement.addEventListener("webglcontextlost", onLost);

  window.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", resize);

  const ro = new ResizeObserver(() => {
    resize();
  });
  ro.observe(host);

  const stopIntroRaf = () => {
    if (introRaf) {
      cancelAnimationFrame(introRaf);
      introRaf = 0;
    }
    if (introResolve) {
      const done = introResolve;
      introResolve = null;
      done();
    }
  };

  const playEnter = () => {
    if (disposed) return Promise.resolve();
    if (introPhase === "ready" || introPhase === "entering") {
      return Promise.resolve();
    }
    stopIntroRaf();
    introPhase = "entering";
    introRim = 0;
    introContent = 0;
    introAssemble = 0;
    renderFrame();

    const t0 = performance.now();
    const rimDur = tokens.enterRimDuration * 1000;
    const contentDelay = tokens.enterContentDelay * 1000;
    const contentDur = tokens.enterContentDuration * 1000;
    const assembleDur = tokens.enterAssembleDuration * 1000;
    const endAt = Math.max(rimDur, contentDelay + contentDur, assembleDur);

    return new Promise<void>((resolve) => {
      introResolve = resolve;
      const step = () => {
        introRaf = 0;
        if (disposed || introPhase !== "entering") {
          stopIntroRaf();
          return;
        }
        const t = performance.now() - t0;
        introRim = easeOutCubic(Math.min(1, t / Math.max(1e-6, rimDur)));
        introContent = easeOutCubic(
          Math.min(
            1,
            Math.max(0, t - contentDelay) / Math.max(1e-6, contentDur),
          ),
        );
        introAssemble = easeOutCubic(
          Math.min(1, t / Math.max(1e-6, assembleDur)),
        );
        renderFrame();
        if (t < endAt) {
          introRaf = requestAnimationFrame(step);
        } else {
          introRim = 1;
          introContent = 1;
          introAssemble = 1;
          introPhase = "ready";
          renderFrame();
          stopIntroRaf();
        }
      };
      introRaf = requestAnimationFrame(step);
    });
  };

  const playExit = () => {
    if (disposed) return Promise.resolve();
    if (introPhase === "pending") return Promise.resolve();
    stopIntroRaf();
    introPhase = "exiting";
    const startRim = introRim;
    const startContent = introContent;
    const t0 = performance.now();
    const dur = Math.max(1, tokens.exitDuration * 1000);

    return new Promise<void>((resolve) => {
      introResolve = resolve;
      const step = () => {
        introRaf = 0;
        if (disposed || !renderer.domElement.isConnected) {
          introRim = 0;
          introContent = 0;
          stopIntroRaf();
          return;
        }
        const u = Math.min(1, (performance.now() - t0) / dur);
        const e = u * u;
        introRim = startRim * (1 - e);
        introContent = startContent * (1 - e);
        renderFrame();
        if (u < 1) {
          introRaf = requestAnimationFrame(step);
        } else {
          introRim = 0;
          introContent = 0;
          renderFrame();
          stopIntroRaf();
        }
      };
      introRaf = requestAnimationFrame(step);
    });
  };

  resize();

  return {
    setIndex: (t: number) => {
      floatIndex = t;
      requestRender();
    },
    getIndex: () => floatIndex,
    setHoverTilt: (x: number, y: number) => {
      if (introPhase !== "ready") return;
      hoverTargetX = x;
      hoverTargetY = y;
      dirty = true;
      ensureLoop();
    },
    setDragging: (next: boolean) => {
      dragging = next;
      if (next) {
        hoverTargetX = 0;
        hoverTargetY = 0;
        hoverX = 0;
        hoverY = 0;
      }
      requestRender();
    },
    playEnter,
    playExit,
    resize,
    pick: (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      if (!hits.length) return null;
      const nearest = Math.round(floatIndex);
      const activeSlug = slabs[nearest]?.slug;
      for (const hit of hits) {
        const slug = hit.object.userData.slug as string | undefined;
        if (slug && slug === activeSlug) return slug;
      }
      return null;
    },
    dispose: () => {
      disposed = true;
      stopIntroRaf();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);

      for (const slab of slabs) {
        for (const layer of [
          slab.shade,
          slab.back,
          slab.rim,
          slab.content,
          slab.front,
        ]) {
          layer.geometry.dispose();
          (layer.material as import("three").Material).dispose();
        }
        slab.texture.dispose();
        slab.bumpMap.dispose();
      }
      slabs.length = 0;
      pickables.length = 0;

      scene.environment = null;
      envTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
