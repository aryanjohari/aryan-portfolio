/**
 * Colourful flow-field particles + ink trails that morph into an approximate
 * homepage wireframe (header / intro / guide) with light 3D depth.
 * Late `p`: agents build edge geometry, then point sprites hide — only depth
 * wireframe lines remain. Shared clock: `t` + `p` from BootOverlay.
 */

const CLEAR = 0x0a0a0a;
const AGENT_COUNT = 96;
const TRAIL_LEN = 24;
/** Edge slots for morph attractors (one per agent while building) */
const TARGET_COUNT = AGENT_COUNT;
const MAX_SEGMENTS = AGENT_COUNT * (TRAIL_LEN - 1);
/** Max outline helper segments (kept off — settle wireframe is particle-built lines) */
const MAX_OUTLINE_SEGS = 120;
const CAMERA_FOV = 48;
const CAMERA_Z = 4.4;
/** Base point size in world units (sizeAttenuation handles depth scale) */
const POINT_SIZE = 0.058;

export type BootFieldHandle = {
  setProgress: (p: number) => void;
  resize: () => void;
  dispose: () => void;
};

export type BootFieldOptions = {
  /** Story progress 0→1 — same source as typing timeline. Read every RAF. */
  getProgress?: () => number;
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

function hash(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
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

/** Nearer (higher z toward camera) → brighter; farther → dimmer. */
function depthFactor(z: number): number {
  return Math.min(1.25, Math.max(0.48, 0.88 + z * 0.16));
}

/** Soft circular sprite for Points (avoids default square nodes). */
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

/** Layered trig flow — living silk; driven by `t` only. */
function flowAngle(x: number, y: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.55 + t * 0.31) * 0.9 +
    Math.cos(y * 0.48 - t * 0.22) * 0.75 +
    Math.sin((x + y) * 0.28 + t * 0.18) * 0.55 +
    Math.cos(z * 0.7 + t * 0.14) * 0.35 +
    Math.sin(x * 0.18 - y * 0.22 + t * 0.09) * 0.4
  );
}

/**
 * Hand-authored approximate homepage layout in normalized screen space.
 * Vertical stack: header → intro → guide (+ nested response panel).
 * Aspect drives content-column width (≈960px shell) and short-viewport compress.
 */
function buildApproxLayout(aspect: number): LayoutRect[] {
  // Wider viewport → narrower column fraction (more side gutter)
  const colW = Math.min(0.78, Math.max(0.52, 0.92 / Math.max(aspect, 0.85)));
  const colX = (1 - colW) * 0.5;

  // Short / tall: compress vertical stack so boxes stay on-screen
  const short = aspect > 1.55 ? 1 : Math.max(0.82, Math.min(1, aspect / 1.2));
  const headerH = Math.max(0.045, 0.055 * short);
  const introH = Math.max(0.16, 0.25 * short);
  const guideH = Math.max(0.22, 0.38 * short);
  const gap1 = 0.04 * short;
  const gap2 = 0.04 * short;

  let y = 0.02;
  const header: LayoutRect = { x: colX, y, w: colW, h: headerH };
  y += headerH + gap1;

  const introInset = colW * 0.025;
  const intro: LayoutRect = {
    x: colX + introInset,
    y,
    w: colW - introInset * 2,
    h: introH,
  };
  y += introH + gap2;

  const guide: LayoutRect = { x: colX, y, w: colW, h: guideH };

  const respInsetX = guide.w * 0.04;
  const respTop = guide.y + guide.h * 0.42;
  const respH = Math.max(0.08, guide.h * 0.42);
  const response: LayoutRect = {
    x: guide.x + respInsetX,
    y: respTop,
    w: guide.w - respInsetX * 2,
    h: Math.min(respH, guide.y + guide.h - respTop - 0.02),
  };

  return [header, intro, guide, response];
}

function rectPerimeter(r: LayoutRect): number {
  return 2 * (r.w + r.h);
}

/** Walk rect perimeter; u in [0,1) → normalized (nx, ny). */
function pointOnRectEdge(r: LayoutRect, u: number): { nx: number; ny: number } {
  const peri = rectPerimeter(r);
  let d = ((u % 1) + 1) % 1 * peri;
  const { x, y, w, h } = r;

  if (d < w) return { nx: x + d, ny: y }; // top L→R
  d -= w;
  if (d < h) return { nx: x + w, ny: y + d }; // right T→B
  d -= h;
  if (d < w) return { nx: x + w - d, ny: y + h }; // bottom R→L
  d -= w;
  return { nx: x, ny: y + h - d }; // left B→T
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

function buildAgents(): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < AGENT_COUNT; i++) {
    agents.push({
      id: i,
      x: (hash(i, 1) - 0.5) * 5.4,
      y: (hash(i, 2) - 0.5) * 4.0,
      z: (hash(i, 3) - 0.5) * 4.0,
      targetIdx: i % TARGET_COUNT,
      hueBias: hash(i, 4) * 360,
      speedBias: 0.7 + hash(i, 5) * 0.6,
      trail: new Float32Array(TRAIL_LEN * 3),
      trailHead: 0,
      trailFilled: 0,
    });
  }
  return agents;
}

export async function createBootField(
  host: HTMLElement,
  opts: BootFieldOptions = {},
): Promise<BootFieldHandle> {
  const THREE = await import("three");
  const getProgress = opts.getProgress;

  let progress = 0;
  let disposed = false;
  let raf = 0;
  let outlineSegCount = 0;

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;";
  host.appendChild(canvas);

  const agents = buildAgents();
  const targets: Vec3[] = Array.from({ length: TARGET_COUNT }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));
  /** Rect index per edge slot — connectors only join neighbors on the same box */
  const targetRect = new Uint8Array(TARGET_COUNT);

  // --- Ink trails (structure builders) ---
  const positions = new Float32Array(MAX_SEGMENTS * 2 * 3);
  const colors = new Float32Array(MAX_SEGMENTS * 2 * 3);
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

  // --- Agent heads (soft circular sprites; size attenuated by depth) ---
  const circleTex = makeCircleTexture(THREE);
  const pointPos = new Float32Array(AGENT_COUNT * 3);
  const pointCol = new Float32Array(AGENT_COUNT * 3);
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
  const pointsMesh = new THREE.Points(pointGeo, pointMat);
  scene.add(pointsMesh);

  // --- Faint homepage wireframe helper (secondary; trails are the reveal) ---
  const outlinePos = new Float32Array(MAX_OUTLINE_SEGS * 2 * 3);
  const outlineGeo = new THREE.BufferGeometry();
  outlineGeo.setAttribute("position", new THREE.BufferAttribute(outlinePos, 3));
  const outlineMat = new THREE.LineBasicMaterial({
    color: 0xe8e0d4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  scene.add(new THREE.LineSegments(outlineGeo, outlineMat));

  const fovRad = (CAMERA_FOV * Math.PI) / 180;

  const rebuildTargets = () => {
    const aspect = camera.aspect;
    const halfH = Math.tan(fovRad * 0.5) * CAMERA_Z;
    const halfW = halfH * aspect;
    const rects = buildApproxLayout(aspect);

    // Distribute TARGET_COUNT along perimeters proportional to length
    const perims = rects.map(rectPerimeter);
    const totalPerim = perims.reduce((s, p) => s + p, 0);
    let ti = 0;
    for (let r = 0; r < rects.length; r++) {
      const share =
        r === rects.length - 1
          ? TARGET_COUNT - ti
          : Math.max(4, Math.round((perims[r] / totalPerim) * TARGET_COUNT));
      for (let k = 0; k < share && ti < TARGET_COUNT; k++, ti++) {
        const u = (k + 0.5) / share;
        const { nx, ny } = pointOnRectEdge(rects[r], u);
        const pt = screenToWorld(nx, ny, halfW, halfH);
        // Light depth variation along perimeter (depth wireframe, not flat CAD)
        pt.z =
          Math.sin(u * Math.PI * 2 + r * 0.7) * 0.22 +
          (hash(ti, 9) - 0.5) * 0.12;
        targets[ti] = pt;
        targetRect[ti] = r;
      }
    }
    while (ti < TARGET_COUNT) {
      targets[ti] = { ...targets[ti - 1] };
      ti += 1;
    }

    // Closed-loop outline segments per rect; cap total
    const segsPerRect = Math.floor(MAX_OUTLINE_SEGS / rects.length);
    let seg = 0;
    for (let r = 0; r < rects.length; r++) {
      const n = Math.max(8, segsPerRect);
      for (let i = 0; i < n && seg < MAX_OUTLINE_SEGS; i++) {
        const a = pointOnRectEdge(rects[r], i / n);
        const b = pointOnRectEdge(rects[r], (i + 1) / n);
        const wa = screenToWorld(a.nx, a.ny, halfW, halfH);
        const wb = screenToWorld(b.nx, b.ny, halfW, halfH);
        const base = seg * 6;
        outlinePos[base] = wa.x;
        outlinePos[base + 1] = wa.y;
        outlinePos[base + 2] = wa.z;
        outlinePos[base + 3] = wb.x;
        outlinePos[base + 4] = wb.y;
        outlinePos[base + 5] = wb.z;
        seg += 1;
      }
    }
    // Zero unused
    for (let s = seg; s < MAX_OUTLINE_SEGS; s++) {
      const base = s * 6;
      for (let k = 0; k < 6; k++) outlinePos[base + k] = 0;
    }
    outlineSegCount = seg;
    outlineGeo.attributes.position.needsUpdate = true;
    outlineGeo.setDrawRange(0, outlineSegCount * 2);
  };

  const pushTrail = (agent: Agent) => {
    const i = agent.trailHead * 3;
    agent.trail[i] = agent.x;
    agent.trail[i + 1] = agent.y;
    agent.trail[i + 2] = agent.z;
    agent.trailHead = (agent.trailHead + 1) % TRAIL_LEN;
    if (agent.trailFilled < TRAIL_LEN) agent.trailFilled += 1;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    rebuildTargets();
  };
  resize();

  const nearestTarget = (x: number, y: number, preferred: number): Vec3 => {
    const primary = targets[preferred];
    let best = primary;
    let bestD = Infinity;
    for (let i = 0; i < TARGET_COUNT; i++) {
      const t = targets[i];
      const dx = t.x - x;
      const dy = t.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    // Blend preferred + nearest so agents distribute along wireframe edges
    return {
      x: primary.x * 0.65 + best.x * 0.35,
      y: primary.y * 0.65 + best.y * 0.35,
      z: primary.z,
    };
  };

  const updateScene = (t: number) => {
    const p = Math.min(
      1,
      Math.max(0, getProgress ? getProgress() : progress),
    );

    // Story arc from `p` — beat1 void/weave · beat2 denser · beat3 snap/settle
    const voidPhase = 1 - smoothstep(0, 0.22, p);
    const awaken = smoothstep(0, 0.32, p);
    const weave = smoothstep(0.1, 0.48, p);
    const converge = smoothstep(0.4, 0.78, p);
    const settle = smoothstep(0.68, 1, p);
    // Last ~30%: snap onto edges. Then hide nodes — lines-only depth wireframe.
    const snap = smoothstep(0.7, 0.96, p);
    const nodeHide = smoothstep(0.82, 0.97, p);

    // Full agent set by snap so every edge slot is occupied
    const activeCount = Math.max(
      10,
      Math.floor(
        10 +
          (AGENT_COUNT - 10) *
            Math.max(0.35 * awaken + 0.65 * weave, snap),
      ),
    );

    const speedScale =
      (0.2 + awaken * 0.45 + weave * 0.75) *
        (1 - converge * 0.45) *
        (1 - snap) +
      settle * 0.02 * (1 - snap);
    // Long trails while weaving; short edge-locked stubs as they become the frame
    const trailVis = Math.max(
      2,
      Math.floor(
        5 +
          (TRAIL_LEN - 5) *
            (0.25 + weave * 0.75) *
            (1 - snap * 0.88),
      ),
    );

    const boundX = 2.7;
    const boundY = 1.95;
    let segIndex = 0;

    for (let a = 0; a < activeCount; a++) {
      const agent = agents[a];
      // Lock each agent to its unique perimeter slot for the morph
      agent.targetIdx = a % TARGET_COUNT;
      const slot = targets[agent.targetIdx];

      const angle = flowAngle(agent.x, agent.y, agent.z, t);
      const curl =
        Math.sin(t * 0.27 + agent.id * 0.17) *
          0.35 *
          weave *
          (1 - converge) *
          (1 - snap) +
        Math.cos(t * 0.19 + agent.hueBias) *
          0.2 *
          awaken *
          (1 - settle) *
          (1 - snap);
      const theta = angle + curl;
      const step = 0.03 * speedScale * agent.speedBias;

      let fx = Math.cos(theta) * step;
      let fy = Math.sin(theta) * step * 0.92;
      let fz =
        Math.sin(theta * 1.3 + t * 0.2 + agent.id * 0.05) *
          step *
          0.7 *
          (1 - snap) +
        Math.cos(t * 0.16 + agent.id * 0.11) *
          step *
          0.25 *
          (1 - settle) *
          (1 - snap);

      // Mid: soft attract to edges. Late: hard pull onto assigned slot.
      const mix = Math.min(1, converge * 0.9 * (1 - snap * 0.5) + snap);
      if (mix > 0.001 && snap < 0.98) {
        const tgt =
          snap > 0.12
            ? slot
            : nearestTarget(agent.x, agent.y, agent.targetIdx);
        const pull = 0.05 + converge * 0.05 + snap * 0.42;
        fx = fx * (1 - mix) + (tgt.x - agent.x) * pull * mix;
        fy = fy * (1 - mix) + (tgt.y - agent.y) * pull * mix;
        fz = fz * (1 - mix) + (tgt.z - agent.z) * pull * mix * 0.9;
      }

      agent.x += fx;
      agent.y += fy;
      agent.z += fz;

      // Final morph: lerp hard onto exact edge geometry
      if (snap > 0.001) {
        const k = 0.12 + snap * 0.55;
        agent.x += (slot.x - agent.x) * k;
        agent.y += (slot.y - agent.y) * k;
        agent.z += (slot.z - agent.z) * k;
      }

      if (mix < 0.85 && snap < 0.5) {
        if (agent.x > boundX) agent.x = -boundX + (agent.x - boundX) * 0.12;
        if (agent.x < -boundX) agent.x = boundX + (agent.x + boundX) * 0.12;
        if (agent.y > boundY) agent.y = -boundY + (agent.y - boundY) * 0.12;
        if (agent.y < -boundY) agent.y = boundY + (agent.y + boundY) * 0.12;
      }

      // Soft z: freer early, flatten onto wireframe plane as snap
      if (converge < 0.5 && snap < 0.3) {
        agent.z = Math.max(-2.4, Math.min(2.4, agent.z));
      }
      agent.z +=
        (slot.z - agent.z) * (converge * 0.02 + settle * 0.04 + snap * 0.2);

      // Fully snapped: micro-breathe only (stay on geometry)
      if (snap > 0.88) {
        const amp = ((snap - 0.88) / 0.12) * 0.0035;
        const breathe = Math.sin(t * 1.1 + agent.id * 0.37) * amp;
        agent.x += breathe * Math.cos(agent.id * 0.9);
        agent.y += breathe * Math.sin(agent.id * 1.1);
      }

      pushTrail(agent);

      // Colour: hue drifts with `t`; calm cream as they become the wireframe
      const baseHue =
        28 +
        Math.sin(t * 0.11 + agent.hueBias * 0.017) * 42 * (1 - snap * 0.85) +
        Math.cos(t * 0.07 + agent.id * 0.04) * 28 * (1 - snap * 0.85) +
        weave * 14 * (1 - snap) -
        settle * 8;
      const sat =
        (0.32 + weave * 0.38 - converge * 0.1 - settle * 0.14 - snap * 0.22) *
        (0.75 + 0.25 * Math.sin(t * 0.15 + agent.id) * (1 - snap));
      const light =
        0.58 +
        awaken * 0.18 -
        settle * 0.02 +
        snap * 0.08 +
        Math.sin(t * 0.21 + agent.hueBias) * 0.04 * (1 - snap);
      const depth = depthFactor(agent.z);

      // Point head — round sprites while moving; faded out by settle
      const pi = a * 3;
      pointPos[pi] = agent.x;
      pointPos[pi + 1] = agent.y;
      pointPos[pi + 2] = agent.z;
      const headBright =
        (0.55 +
          weave * 0.35 +
          converge * 0.2 -
          voidPhase * 0.08) *
        Math.max(0.25, awaken) *
        depth *
        (1 - nodeHide);
      const [hr, hg, hb] = hslToRgb(
        baseHue,
        Math.min(0.58, Math.max(0.06, sat + 0.06 * (1 - snap))),
        Math.min(0.88, Math.max(0.38, light + 0.08)),
      );
      pointCol[pi] = hr * Math.min(1, headBright);
      pointCol[pi + 1] = hg * Math.min(1, headBright);
      pointCol[pi + 2] = hb * Math.min(1, headBright);

      // Ink trails fade as the line wireframe takes over
      const filled = Math.min(agent.trailFilled, trailVis);
      if (filled >= 2 && nodeHide < 0.95) {
        for (let s = 0; s < filled - 1; s++) {
          if (segIndex >= MAX_SEGMENTS) break;

          const age = s / (filled - 1);
          const fade = age * age;
          const alphaBoost =
            (0.28 +
              weave * 0.55 +
              converge * 0.28 +
              settle * 0.1 -
              snap * 0.2 -
              voidPhase * 0.05) *
            fade *
            Math.max(0.25, awaken) *
            (1 - snap * 0.5) *
            (1 - nodeHide);

          const oldestOffset = filled - 1;
          const i0 =
            ((agent.trailHead - 1 - oldestOffset + s + TRAIL_LEN * 4) %
              TRAIL_LEN) *
            3;
          const i1 =
            ((agent.trailHead - 1 - oldestOffset + s + 1 + TRAIL_LEN * 4) %
              TRAIL_LEN) *
            3;

          const base = segIndex * 6;
          positions[base] = agent.trail[i0];
          positions[base + 1] = agent.trail[i0 + 1];
          positions[base + 2] = agent.trail[i0 + 2];
          positions[base + 3] = agent.trail[i1];
          positions[base + 4] = agent.trail[i1 + 1];
          positions[base + 5] = agent.trail[i1 + 2];

          const midZ = (agent.trail[i0 + 2] + agent.trail[i1 + 2]) * 0.5;
          const trailDepth = 0.7 + depthFactor(midZ) * 0.3;

          const [r, g, b] = hslToRgb(
            baseHue + age * 10 * (1 - snap),
            Math.min(0.58, Math.max(0.06, sat)),
            Math.min(0.84, Math.max(0.32, light + age * 0.12)),
          );
          const dim = Math.min(1, alphaBoost * trailDepth);
          colors[base] = r * dim;
          colors[base + 1] = g * dim;
          colors[base + 2] = b * dim;
          colors[base + 3] = r * Math.min(1, dim * 1.15);
          colors[base + 4] = g * Math.min(1, dim * 1.15);
          colors[base + 5] = b * Math.min(1, dim * 1.15);

          segIndex += 1;
        }
      }

      // Depth wireframe edges from slot geometry (no nodes) — strengthens with snap
      if (snap > 0.2 && segIndex < MAX_SEGMENTS) {
        const rectId = targetRect[agent.targetIdx];
        let connectIdx = (agent.targetIdx + 1) % TARGET_COUNT;
        if (targetRect[connectIdx] !== rectId) {
          let first = agent.targetIdx;
          while (first > 0 && targetRect[first - 1] === rectId) first -= 1;
          connectIdx = first;
        }
        if (connectIdx !== agent.targetIdx && targetRect[connectIdx] === rectId) {
          const next = targets[connectIdx];
          // Prefer exact slot positions once snapping so the frame is clean lines
          const useSlot = snap > 0.45;
          const ax = useSlot ? slot.x : agent.x;
          const ay = useSlot ? slot.y : agent.y;
          const az = useSlot ? slot.z : agent.z;
          const bx = next.x;
          const by = next.y;
          const bz = next.z;
          const base = segIndex * 6;
          positions[base] = ax;
          positions[base + 1] = ay;
          positions[base + 2] = az;
          positions[base + 3] = bx;
          positions[base + 4] = by;
          positions[base + 5] = bz;
          const dA = depthFactor(az);
          const dB = depthFactor(bz);
          const edgeBase =
            (0.2 + snap * 0.65 + settle * 0.1) * (0.55 + nodeHide * 0.45);
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
    }

    for (let s = segIndex; s < MAX_SEGMENTS; s++) {
      const base = s * 6;
      for (let k = 0; k < 6; k++) {
        positions[base + k] = 0;
        colors[base + k] = 0;
      }
    }

    // Clear inactive point slots
    for (let a = activeCount; a < AGENT_COUNT; a++) {
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
    // Trails early; settle = clean depth wireframe lines
    lineMat.opacity =
      0.55 + weave * 0.3 * (1 - snap) + snap * 0.5 + nodeHide * 0.15;

    pointGeo.setDrawRange(0, activeCount);
    pointGeo.attributes.position.needsUpdate = true;
    pointGeo.attributes.color.needsUpdate = true;
    pointMat.opacity = Math.max(
      0,
      (0.75 + weave * 0.2) * (1 - nodeHide),
    );
    pointMat.size = POINT_SIZE * (0.9 + awaken * 0.15 + converge * 0.08);
    pointsMesh.visible = pointMat.opacity > 0.02;

    // Independent outline stays off — settle wireframe is the edge line segments
    outlineMat.opacity = 0;

    // Parallax early; locked once wireframe is formed
    const live = 1 - Math.max(settle * 0.92, snap * 0.95);
    camera.position.x = Math.sin(t * 0.1) * 0.07 * live;
    camera.position.y = Math.cos(t * 0.08) * 0.045 * live;
    camera.position.z = CAMERA_Z + Math.sin(t * 0.06) * 0.08 * live;
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
      outlineGeo.dispose();
      outlineMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
