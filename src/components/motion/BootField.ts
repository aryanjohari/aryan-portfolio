/**
 * Simple boot field: void roam → one center frame → morph to ask bar → lines.
 * Shared clock `t` + `p` from BootOverlay. Wireframe uses rounded/pill perimeter
 * matching `.portfolio-guide-float` border-radius (not sharp rect edges).
 */

const CLEAR = 0x0a0a0a;
/** Mid-laptop budget; mobile/coarse use lighter opts from BootOverlay. */
const DEFAULT_AGENT_COUNT = 160;
const DEFAULT_TRAIL_LEN = 24;
const DEFAULT_MAX_DPR = 2;
const CAMERA_FOV = 48;
const CAMERA_Z = 4.4;
const POINT_SIZE = 0.078;

export type BootFieldHandle = {
  setProgress: (p: number) => void;
  resize: () => void;
  dispose: () => void;
};

export type BootFieldOptions = {
  /** Story progress 0→1 — same source as typing timeline. Read every RAF. */
  getProgress?: () => number;
  /** Particle count (desktop ~160, mobile ~80). */
  agentCount?: number;
  /** Trail length per agent (desktop ~24, mobile ~14). */
  trailLen?: number;
  /** Cap devicePixelRatio (desktop 2, mobile 1.5). */
  maxDpr?: number;
};

type Agent = {
  id: number;
  x: number;
  y: number;
  z: number;
  targetIdx: number;
  hueBias: number;
  speedBias: number;
  trail: Float32Array;
  trailHead: number;
  trailFilled: number;
};

type Vec3 = { x: number; y: number; z: number };
/** Normalized viewport rect — origin top-left, CSS-like [0,1]. */
type LayoutRect = { x: number; y: number; w: number; h: number };
/** Ask/text frame with CSS-circular corner radius (px). */
type LayoutShape = LayoutRect & { radiusPx: number };

function hash(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpShape(a: LayoutShape, b: LayoutShape, t: number): LayoutShape {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    radiusPx: lerp(a.radiusPx, b.radiusPx, t),
  };
}

function clampRadiusPx(shape: LayoutShape, vw: number, vh: number): number {
  const width = Math.max(1, shape.w * vw);
  const height = Math.max(1, shape.h * vh);
  return Math.min(Math.max(0, shape.radiusPx), width * 0.5, height * 0.5);
}

/** Stadium / full pill radius for a normalized rect. */
function pillRadiusPx(rect: LayoutRect, vw: number, vh: number): number {
  return Math.min(rect.w * vw, rect.h * vh) * 0.5;
}

function asPillShape(rect: LayoutRect, vw: number, vh: number): LayoutShape {
  return { ...rect, radiusPx: pillRadiusPx(rect, vw, vh) };
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [r + m, g + m, b + m];
}

function depthFactor(z: number): number {
  return Math.min(1.55, Math.max(0.28, 0.72 + z * 0.32));
}

function pointSizeScale(z: number): number {
  return Math.min(1.85, Math.max(0.32, 1.05 + z * 0.38));
}

function makeCircleTexture(THREE: typeof import("three")) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) {
    return new THREE.Texture();
  }
  const g = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.48,
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.85)");
  g.addColorStop(0.75, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function flowAngle(x: number, y: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.55 + t * 0.31) * 0.9 +
    Math.cos(y * 0.48 - t * 0.22) * 0.75 +
    Math.sin((x + y) * 0.28 + t * 0.18) * 0.55 +
    Math.cos(z * 0.7 + t * 0.14) * 0.35 +
    Math.sin(x * 0.18 - y * 0.22 + t * 0.09) * 0.4
  );
}

function domToLayoutRect(
  el: Element,
  vw: number,
  vh: number,
  padX = 0,
  padY = 0,
): LayoutRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2 || vw < 1 || vh < 1) return null;
  const px = padX / vw;
  const py = padY / vh;
  return {
    x: r.left / vw - px,
    y: r.top / vh - py,
    w: r.width / vw + px * 2,
    h: r.height / vh + py * 2,
  };
}

/** Computed border-radius in px (circular CSS corners), clamped to stadium. */
function readBorderRadiusPx(el: Element, widthPx: number, heightPx: number): number {
  const style = getComputedStyle(el);
  const tl = parseFloat(style.borderTopLeftRadius) || 0;
  const tr = parseFloat(style.borderTopRightRadius) || 0;
  const br = parseFloat(style.borderBottomRightRadius) || 0;
  const bl = parseFloat(style.borderBottomLeftRadius) || 0;
  const r = Math.max(tl, tr, br, bl);
  return Math.min(r, widthPx * 0.5, heightPx * 0.5);
}

function approxCenterBar(aspect: number): LayoutRect {
  const w = Math.min(0.42, Math.max(0.28, 0.55 / Math.max(aspect, 0.9)));
  const h = Math.max(0.07, 0.1 / Math.max(aspect * 0.55, 0.85));
  return { x: (1 - w) * 0.5, y: 0.5 - h * 0.5, w, h };
}

/** Fallback text frame — same center as ask so morph stays one object. */
function approxTextFrame(ask: LayoutRect): LayoutRect {
  const w = Math.min(ask.w * 0.92, 0.38);
  const h = Math.max(0.055, ask.h * 0.72);
  return {
    x: ask.x + (ask.w - w) * 0.5,
    y: ask.y + (ask.h - h) * 0.5,
    w,
    h,
  };
}

/**
 * Point on rounded-rect / stadium perimeter (CSS-circular corners).
 * Walks top → TR arc → right → BR arc → bottom → BL arc → left → TL arc.
 */
function pointOnRoundedRectEdge(
  shape: LayoutShape,
  u: number,
  vw: number,
  vh: number,
): { nx: number; ny: number } {
  const left = shape.x * vw;
  const top = shape.y * vh;
  const width = Math.max(1, shape.w * vw);
  const height = Math.max(1, shape.h * vh);
  const rad = clampRadiusPx(shape, vw, vh);

  const straightW = Math.max(0, width - 2 * rad);
  const straightH = Math.max(0, height - 2 * rad);
  const arcLen = rad > 0 ? Math.PI * 0.5 * rad : 0;
  const peri = 2 * (straightW + straightH) + 4 * arcLen;
  let d = (((u % 1) + 1) % 1) * Math.max(peri, 1e-6);

  // Top straight L→R
  if (d <= straightW) {
    return { nx: (left + rad + d) / vw, ny: top / vh };
  }
  d -= straightW;

  // Top-right quarter (from up to right)
  if (d <= arcLen) {
    const theta = -Math.PI / 2 + (rad > 0 ? d / rad : 0);
    const cx = left + width - rad;
    const cy = top + rad;
    return {
      nx: (cx + rad * Math.cos(theta)) / vw,
      ny: (cy + rad * Math.sin(theta)) / vh,
    };
  }
  d -= arcLen;

  // Right straight T→B
  if (d <= straightH) {
    return { nx: (left + width) / vw, ny: (top + rad + d) / vh };
  }
  d -= straightH;

  // Bottom-right quarter (right → down)
  if (d <= arcLen) {
    const theta = 0 + (rad > 0 ? d / rad : 0);
    const cx = left + width - rad;
    const cy = top + height - rad;
    return {
      nx: (cx + rad * Math.cos(theta)) / vw,
      ny: (cy + rad * Math.sin(theta)) / vh,
    };
  }
  d -= arcLen;

  // Bottom straight R→L
  if (d <= straightW) {
    return { nx: (left + width - rad - d) / vw, ny: (top + height) / vh };
  }
  d -= straightW;

  // Bottom-left quarter (down → left)
  if (d <= arcLen) {
    const theta = Math.PI / 2 + (rad > 0 ? d / rad : 0);
    const cx = left + rad;
    const cy = top + height - rad;
    return {
      nx: (cx + rad * Math.cos(theta)) / vw,
      ny: (cy + rad * Math.sin(theta)) / vh,
    };
  }
  d -= arcLen;

  // Left straight B→T
  if (d <= straightH) {
    return { nx: left / vw, ny: (top + height - rad - d) / vh };
  }
  d -= straightH;

  // Top-left quarter (left → up)
  const theta = Math.PI + (rad > 0 ? d / rad : 0);
  const cx = left + rad;
  const cy = top + rad;
  return {
    nx: (cx + rad * Math.cos(theta)) / vw,
    ny: (cy + rad * Math.sin(theta)) / vh,
  };
}

function screenToWorld(
  nx: number,
  ny: number,
  halfW: number,
  halfH: number,
): Vec3 {
  return {
    x: (nx - 0.5) * 2 * halfW,
    y: (0.5 - ny) * 2 * halfH,
    z: 0,
  };
}

function buildAgents(agentCount: number, trailLen: number): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < agentCount; i++) {
    agents.push({
      id: i,
      x: (hash(i, 1) - 0.5) * 5.4,
      y: (hash(i, 2) - 0.5) * 4.0,
      z: (hash(i, 3) - 0.5) * 5.6,
      targetIdx: i % agentCount,
      hueBias: hash(i, 4) * 360,
      speedBias: 0.7 + hash(i, 5) * 0.6,
      trail: new Float32Array(trailLen * 3),
      trailHead: 0,
      trailFilled: 0,
    });
  }
  return agents;
}

function fillBarTargets(
  shape: LayoutShape,
  vw: number,
  vh: number,
  halfW: number,
  halfH: number,
  targets: Vec3[],
  targetCount: number,
): void {
  for (let i = 0; i < targetCount; i++) {
    const u = (i + 0.5) / targetCount;
    const { nx, ny } = pointOnRoundedRectEdge(shape, u, vw, vh);
    const pt = screenToWorld(nx, ny, halfW, halfH);
    pt.z =
      Math.sin(u * Math.PI * 2) * 0.14 + (hash(i, 9) - 0.5) * 0.08;
    targets[i] = pt;
  }
}

export async function createBootField(
  host: HTMLElement,
  opts: BootFieldOptions = {},
): Promise<BootFieldHandle> {
  const THREE = await import("three");
  const getProgress = opts.getProgress;
  const agentCount = Math.max(12, opts.agentCount ?? DEFAULT_AGENT_COUNT);
  const trailLen = Math.max(4, opts.trailLen ?? DEFAULT_TRAIL_LEN);
  const maxDpr = opts.maxDpr ?? DEFAULT_MAX_DPR;
  const targetCount = agentCount;
  const maxSegments = agentCount * (trailLen - 1);

  let progress = 0;
  let disposed = false;
  let raf = 0;

  let frozenAsk: LayoutShape | null = null;
  let frozenText: LayoutShape | null = null;
  let textLocked = false;

  const clock = new THREE.Clock(true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setClearColor(CLEAR, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;";
  host.appendChild(canvas);

  const agents = buildAgents(agentCount, trailLen);
  const targets: Vec3[] = Array.from({ length: targetCount }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));

  const positions = new Float32Array(maxSegments * 2 * 3);
  const colors = new Float32Array(maxSegments * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  scene.add(new THREE.LineSegments(lineGeo, lineMat));

  const circleTex = makeCircleTexture(THREE);
  const pointPos = new Float32Array(agentCount * 3);
  const pointCol = new Float32Array(agentCount * 3);
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute("position", new THREE.BufferAttribute(pointPos, 3));
  pointGeo.setAttribute("color", new THREE.BufferAttribute(pointCol, 3));
  const pointMat = new THREE.PointsMaterial({
    size: POINT_SIZE,
    map: circleTex,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.02,
  });
  pointMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
  float bootDepthScale = clamp(1.08 + position.z * 0.42, 0.3, 1.9);
  gl_PointSize *= bootDepthScale;`,
    );
  };
  const pointsMesh = new THREE.Points(pointGeo, pointMat);
  scene.add(pointsMesh);

  const fovRad = (CAMERA_FOV * Math.PI) / 180;

  const measureAsk = (vw: number, vh: number): LayoutShape | null => {
    const el = document.querySelector(
      ".void-chrome--home .portfolio-guide-float",
    );
    if (!el) return null;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return null;
    const rect = domToLayoutRect(el, vw, vh);
    if (!rect) return null;
    return {
      ...rect,
      radiusPx: readBorderRadiusPx(el, box.width, box.height),
    };
  };

  const measureText = (
    vw: number,
    vh: number,
    ask: LayoutShape,
  ): LayoutShape => {
    const line = document.querySelector("[data-boot-line]");
    const padded = line ? domToLayoutRect(line, vw, vh, 28, 18) : null;
    if (padded && padded.w > 0.04 && padded.h > 0.02) {
      // Same corner language as ask (pill↔pill), scaled to text frame height
      const askR = clampRadiusPx(ask, vw, vh);
      const askH = Math.max(1, ask.h * vh);
      const textH = Math.max(1, padded.h * vh);
      const scale = textH / askH;
      return {
        ...padded,
        radiusPx: Math.min(
          askR * scale,
          padded.w * vw * 0.5,
          padded.h * vh * 0.5,
        ),
      };
    }
    return asPillShape(approxTextFrame(ask), vw, vh);
  };

  const sampleBars = (vw: number, vh: number, aspect: number) => {
    // Freeze ask once measured; clear only on resize. Single-bar fallback.
    if (!frozenAsk) {
      const measured = measureAsk(vw, vh);
      if (measured) frozenAsk = measured;
    }
    const ask =
      frozenAsk ?? asPillShape(approxCenterBar(aspect), vw, vh);

    if (!textLocked) {
      frozenText = measureText(vw, vh, ask);
    } else if (!frozenText) {
      frozenText = asPillShape(approxTextFrame(ask), vw, vh);
    }

    return {
      text: frozenText ?? asPillShape(approxTextFrame(ask), vw, vh),
      ask,
    };
  };

  const rebuildTargets = (morphT: number) => {
    const vw = host.clientWidth || window.innerWidth;
    const vh = host.clientHeight || window.innerHeight;
    const aspect = camera.aspect;
    const halfH = Math.tan(fovRad * 0.5) * CAMERA_Z;
    const halfW = halfH * aspect;
    // Lock text frame once morph begins so ask morph is stable
    if (morphT > 0.02) textLocked = true;
    const { text, ask } = sampleBars(vw, vh, aspect);
    const shape = lerpShape(text, ask, morphT);
    fillBarTargets(shape, vw, vh, halfW, halfH, targets, targetCount);
  };

  const pushTrail = (agent: Agent) => {
    const i = agent.trailHead * 3;
    agent.trail[i] = agent.x;
    agent.trail[i + 1] = agent.y;
    agent.trail[i + 2] = agent.z;
    agent.trailHead = (agent.trailHead + 1) % trailLen;
    if (agent.trailFilled < trailLen) agent.trailFilled += 1;
  };

  for (const agent of agents) {
    for (let k = 0; k < 3; k++) pushTrail(agent);
  }

  const resize = () => {
    if (disposed) return;
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(w, h, false);
    frozenAsk = null;
    frozenText = null;
    textLocked = false;
    rebuildTargets(1);
  };
  resize();

  // Measure after layout; brief retries if ask bar not ready
  await new Promise<void>((resolve) => {
    let tries = 0;
    const tryMeasure = () => {
      if (disposed) {
        resolve();
        return;
      }
      const vw = host.clientWidth || window.innerWidth;
      const vh = host.clientHeight || window.innerHeight;
      const ask = measureAsk(vw, vh);
      if (ask) {
        frozenAsk = ask;
        frozenText = null;
        textLocked = false;
        rebuildTargets(0);
        resolve();
        return;
      }
      tries += 1;
      if (tries >= 8) {
        rebuildTargets(0);
        resolve();
        return;
      }
      requestAnimationFrame(tryMeasure);
    };
    requestAnimationFrame(() => requestAnimationFrame(tryMeasure));
  });

  let lastMorphBucket = -1;
  let lastFrameBucket = -1;

  const updateScene = (t: number) => {
    const p = Math.min(
      1,
      Math.max(0, getProgress ? getProgress() : progress),
    );

    // Simple arc: roam → gather on center frame → morph to ask → settle
    const awaken = smoothstep(0, 0.28, p);
    const weave = smoothstep(0.05, 0.4, p);
    const gather = smoothstep(0.4, 0.75, p);
    const morph = smoothstep(0.75, 0.95, p);
    const settle = smoothstep(0.82, 1, p);
    const snap = smoothstep(0.78, 0.98, p);
    const nodeHide = smoothstep(0.86, 0.99, p);
    const roamOnly = 1 - gather;

    const morphBucket = Math.floor(morph * 28);
    if (morphBucket !== lastMorphBucket) {
      lastMorphBucket = morphBucket;
      rebuildTargets(morph);
    } else if (!textLocked && gather > 0.05 && morph < 0.05) {
      const fb = Math.floor(gather * 14);
      if (fb !== lastFrameBucket) {
        lastFrameBucket = fb;
        rebuildTargets(0);
      }
    }

    const activeCount = Math.max(
      12,
      Math.floor(
        12 +
          (agentCount - 12) *
            Math.max(0.4 * awaken + 0.6 * weave, gather, snap),
      ),
    );

    const speedScale =
      (0.22 + awaken * 0.45 + weave * 0.7) * roamOnly * (1 - snap * 0.5) +
      gather * 0.08 * (1 - snap) +
      settle * 0.015 * (1 - snap);

    const trailVis = Math.max(
      3,
      Math.floor(
        Math.min(7, trailLen) +
          (trailLen - Math.min(7, trailLen)) *
            (0.4 + weave * 0.7) *
            (1 - snap * 0.82),
      ),
    );

    const boundX = 2.7;
    const boundY = 1.95;
    const boundZ = 3.2;
    let segIndex = 0;

    for (let a = 0; a < activeCount; a++) {
      const agent = agents[a];
      const homeIdx = a % targetCount;
      agent.targetIdx = homeIdx;
      const slot = targets[homeIdx];

      const angle = flowAngle(agent.x, agent.y, agent.z, t);
      const curl =
        Math.sin(t * 0.27 + agent.id * 0.17) * 0.35 * weave * roamOnly +
        Math.cos(t * 0.19 + agent.hueBias) * 0.2 * awaken * roamOnly;
      const theta = angle + curl;
      const step = 0.03 * speedScale * agent.speedBias;

      let fx = Math.cos(theta) * step;
      let fy = Math.sin(theta) * step * 0.92;
      let fz =
        (Math.sin(theta * 1.3 + t * 0.22 + agent.id * 0.05) * 1.35 +
          Math.cos(t * 0.18 + agent.id * 0.11) * 0.55 +
          Math.sin(t * 0.09 + agent.hueBias * 0.02) * 0.4) *
        step *
        roamOnly;

      // Single attractor: center bar (text frame → ask). No rail redirects.
      const pullMix = Math.min(1, gather * 0.95 + morph * 0.85 + snap);
      if (pullMix > 0.001) {
        const pull = 0.035 + gather * 0.08 + morph * 0.12 + snap * 0.45;
        fx = fx * (1 - pullMix) + (slot.x - agent.x) * pull * pullMix;
        fy = fy * (1 - pullMix) + (slot.y - agent.y) * pull * pullMix;
        fz = fz * (1 - pullMix) + (slot.z - agent.z) * pull * pullMix * 0.85;
      }

      agent.x += fx;
      agent.y += fy;
      agent.z += fz;

      if (snap > 0.001) {
        const k = 0.14 + snap * 0.55;
        agent.x += (slot.x - agent.x) * k;
        agent.y += (slot.y - agent.y) * k;
        agent.z += (slot.z - agent.z) * k;
      }

      if (pullMix < 0.8 && snap < 0.45) {
        if (agent.x > boundX) agent.x = -boundX + (agent.x - boundX) * 0.12;
        if (agent.x < -boundX) agent.x = boundX + (agent.x + boundX) * 0.12;
        if (agent.y > boundY) agent.y = -boundY + (agent.y - boundY) * 0.12;
        if (agent.y < -boundY) agent.y = boundY + (agent.y + boundY) * 0.12;
        if (agent.z > boundZ) agent.z = boundZ - (agent.z - boundZ) * 0.2;
        if (agent.z < -boundZ) agent.z = -boundZ - (agent.z + boundZ) * 0.2;
      }

      // Flatten slightly onto the bar as we settle
      agent.z += (slot.z - agent.z) * (gather * 0.015 + morph * 0.04 + snap * 0.22);

      if (snap > 0.88) {
        const amp = ((snap - 0.88) / 0.12) * 0.003;
        const breathe = Math.sin(t * 1.1 + agent.id * 0.37) * amp;
        agent.x += breathe * Math.cos(agent.id * 0.9);
        agent.y += breathe * Math.sin(agent.id * 1.1);
      }

      pushTrail(agent);

      const baseHue =
        28 +
        Math.sin(t * 0.11 + agent.hueBias * 0.017) * 42 * (1 - snap * 0.85) +
        Math.cos(t * 0.07 + agent.id * 0.04) * 28 * (1 - snap * 0.85) +
        weave * 14 * roamOnly -
        settle * 8;
      const sat =
        (0.32 + weave * 0.38 - gather * 0.08 - settle * 0.14 - snap * 0.22) *
        (0.75 + 0.25 * Math.sin(t * 0.15 + agent.id) * (1 - snap));
      const light =
        0.58 +
        awaken * 0.18 -
        settle * 0.02 +
        snap * 0.08 +
        Math.sin(t * 0.21 + agent.hueBias) * 0.04 * (1 - snap);
      const depth = depthFactor(agent.z);
      const sizeBoost = pointSizeScale(agent.z);

      const pi = a * 3;
      pointPos[pi] = agent.x;
      pointPos[pi + 1] = agent.y;
      pointPos[pi + 2] = agent.z;
      const headBright =
        (0.62 + weave * 0.4 - roamOnly * 0.05) *
        Math.max(0.3, awaken) *
        depth *
        sizeBoost *
        (1 - nodeHide);
      const [hr, hg, hb] = hslToRgb(
        baseHue,
        Math.min(0.62, Math.max(0.06, sat + 0.08 * (1 - snap))),
        Math.min(0.92, Math.max(0.32, light + 0.1 * depth)),
      );
      pointCol[pi] = hr * Math.min(1, headBright);
      pointCol[pi + 1] = hg * Math.min(1, headBright);
      pointCol[pi + 2] = hb * Math.min(1, headBright);

      const filled = Math.min(agent.trailFilled, trailVis);
      if (filled >= 2 && nodeHide < 0.95) {
        for (let s = 0; s < filled - 1; s++) {
          if (segIndex >= maxSegments) break;
          const age = s / (filled - 1);
          const fade = age * age;
          const alphaBoost =
            (0.38 + weave * 0.65 + gather * 0.12 - snap * 0.18) *
            fade *
            Math.max(0.3, awaken) *
            (1 - snap * 0.45) *
            (1 - nodeHide);

          const oldestOffset = filled - 1;
          const i0 =
            ((agent.trailHead - 1 - oldestOffset + s + trailLen * 4) %
              trailLen) *
            3;
          const i1 =
            ((agent.trailHead - 1 - oldestOffset + s + 1 + trailLen * 4) %
              trailLen) *
            3;

          const base = segIndex * 6;
          positions[base] = agent.trail[i0];
          positions[base + 1] = agent.trail[i0 + 1];
          positions[base + 2] = agent.trail[i0 + 2];
          positions[base + 3] = agent.trail[i1];
          positions[base + 4] = agent.trail[i1 + 1];
          positions[base + 5] = agent.trail[i1 + 2];

          const midZ = (agent.trail[i0 + 2] + agent.trail[i1 + 2]) * 0.5;
          const trailDepth = 0.45 + depthFactor(midZ) * 0.65;
          const [r, g, b] = hslToRgb(
            baseHue + age * 10 * (1 - snap),
            Math.min(0.62, Math.max(0.06, sat)),
            Math.min(0.88, Math.max(0.28, light + age * 0.14)),
          );
          const dim = Math.min(1.15, alphaBoost * trailDepth);
          colors[base] = r * dim;
          colors[base + 1] = g * dim;
          colors[base + 2] = b * dim;
          colors[base + 3] = r * Math.min(1, dim * 1.15);
          colors[base + 4] = g * Math.min(1, dim * 1.15);
          colors[base + 5] = b * Math.min(1, dim * 1.15);
          segIndex += 1;
        }
      }

      // Closed loop on the single bar
      if (snap > 0.12 && segIndex < maxSegments) {
        const next = targets[(homeIdx + 1) % targetCount];
        const useSlot = snap > 0.35 || morph > 0.4;
        const ax = useSlot ? slot.x : agent.x;
        const ay = useSlot ? slot.y : agent.y;
        const az = useSlot ? slot.z : agent.z;
        const base = segIndex * 6;
        positions[base] = ax;
        positions[base + 1] = ay;
        positions[base + 2] = az;
        positions[base + 3] = next.x;
        positions[base + 4] = next.y;
        positions[base + 5] = next.z;
        const dA = depthFactor(az);
        const dB = depthFactor(next.z);
        const edgeBase =
          (0.22 + snap * 0.68 + settle * 0.1) * (0.55 + nodeHide * 0.45);
        const [er, eg, eb] = hslToRgb(
          36 + snap * 2,
          Math.min(0.14, Math.max(0.04, 0.1 - snap * 0.04)),
          Math.min(0.8, 0.62 + snap * 0.12),
        );
        colors[base] = er * edgeBase * dA * 0.85;
        colors[base + 1] = eg * edgeBase * dA * 0.85;
        colors[base + 2] = eb * edgeBase * dA * 0.85;
        colors[base + 3] = er * edgeBase * dB;
        colors[base + 4] = eg * edgeBase * dB;
        colors[base + 5] = eb * edgeBase * dB;
        segIndex += 1;
      }
    }

    for (let s = segIndex; s < maxSegments; s++) {
      const base = s * 6;
      for (let k = 0; k < 6; k++) {
        positions[base + k] = 0;
        colors[base + k] = 0;
      }
    }

    for (let a = activeCount; a < agentCount; a++) {
      const pi = a * 3;
      pointPos[pi] = 0;
      pointPos[pi + 1] = 0;
      pointPos[pi + 2] = -10;
      pointCol[pi] = 0;
      pointCol[pi + 1] = 0;
      pointCol[pi + 2] = 0;
    }

    lineGeo.setDrawRange(0, segIndex * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineMat.opacity =
      0.62 + weave * 0.35 * roamOnly + snap * 0.5 + nodeHide * 0.15;

    pointGeo.setDrawRange(0, activeCount);
    pointGeo.attributes.position.needsUpdate = true;
    pointGeo.attributes.color.needsUpdate = true;
    pointMat.opacity = Math.max(0, (0.82 + weave * 0.2) * (1 - nodeHide));
    pointMat.size = POINT_SIZE * (1 + awaken * 0.2 + weave * 0.12);
    pointsMesh.visible = pointMat.opacity > 0.02;

    const live = 1 - Math.max(settle * 0.92, snap * 0.95);
    camera.position.x = Math.sin(t * 0.12) * 0.14 * live;
    camera.position.y = Math.cos(t * 0.09) * 0.09 * live;
    camera.position.z = CAMERA_Z + Math.sin(t * 0.07) * 0.18 * live;
    camera.lookAt(0, 0, 0);
  };

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden) return;
    updateScene(clock.getElapsedTime());
    renderer.render(scene, camera);
  };

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf && !disposed) {
      tick();
    }
  };

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  tick();

  return {
    setProgress: (p: number) => {
      progress = p;
    },
    resize,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      lineGeo.dispose();
      lineMat.dispose();
      pointGeo.dispose();
      pointMat.dispose();
      circleTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
