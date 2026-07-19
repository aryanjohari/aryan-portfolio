/**
 * Colourful flow-field ink trails for desktop boot.
 * `progress` (0→1) = story arc; `clock` elapsed time = living motion every frame.
 */

const CLEAR = 0x0a0a0a;
const AGENT_COUNT = 100;
const TRAIL_LEN = 18;
/** Max vertices drawn: agents × (trail segments × 2) */
const MAX_SEGMENTS = AGENT_COUNT * (TRAIL_LEN - 1);

export type BootFieldHandle = {
  setProgress: (p: number) => void;
  resize: () => void;
  dispose: () => void;
};

type Agent = {
  id: number;
  x: number;
  y: number;
  z: number;
  hueBias: number;
  speedBias: number;
  trail: Float32Array; // TRAIL_LEN * 3
  trailHead: number;
  trailFilled: number;
};

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

/** Layered trig flow — soft ink weave, not a grid. */
function flowAngle(x: number, y: number, z: number, time: number): number {
  const a =
    Math.sin(x * 0.55 + time * 0.31) * 0.9 +
    Math.cos(y * 0.48 - time * 0.22) * 0.75 +
    Math.sin((x + y) * 0.28 + time * 0.18) * 0.55 +
    Math.cos(z * 0.7 + time * 0.14) * 0.35 +
    Math.sin(x * 0.18 - y * 0.22 + time * 0.09) * 0.4;
  return a;
}

function buildAgents(): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < AGENT_COUNT; i++) {
    agents.push({
      id: i,
      x: (hash(i, 1) - 0.5) * 5.2,
      y: (hash(i, 2) - 0.5) * 3.8,
      z: (hash(i, 3) - 0.5) * 1.6,
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
): Promise<BootFieldHandle> {
  const THREE = await import("three");

  let progress = 0;
  let disposed = false;
  let raf = 0;

  const clock = new THREE.Clock(true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.z = 4.4;

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setClearColor(CLEAR, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const agents = buildAgents();

  // LineSegments: each trail segment = 2 verts with vertex colors
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
    blending: THREE.NormalBlending,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const pushTrail = (agent: Agent) => {
    const i = agent.trailHead * 3;
    agent.trail[i] = agent.x;
    agent.trail[i + 1] = agent.y;
    agent.trail[i + 2] = agent.z;
    agent.trailHead = (agent.trailHead + 1) % TRAIL_LEN;
    if (agent.trailFilled < TRAIL_LEN) agent.trailFilled += 1;
  };

  // Seed trails with initial positions
  for (const agent of agents) {
    for (let k = 0; k < 3; k++) pushTrail(agent);
  }

  const resize = () => {
    if (disposed) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
  };
  resize();

  const updateScene = (time: number) => {
    const p = Math.min(1, Math.max(0, progress));
    const awaken = smoothstep(0, 0.38, p);
    const weave = smoothstep(0.1, 0.68, p);
    const settle = smoothstep(0.58, 1, p);

    // Active agent count: sparse void → full weave → still full but calmer
    const activeCount = Math.max(
      8,
      Math.floor(8 + (AGENT_COUNT - 8) * awaken * (0.55 + 0.45 * weave)),
    );

    // Speed: faint drift early, lively mid, slowed settle — still moves every frame
    const speedScale =
      (0.22 + awaken * 0.55 + weave * 0.7) * (1 - settle * 0.62);
    const trailVis = Math.max(
      3,
      Math.floor(4 + (TRAIL_LEN - 4) * (0.25 + weave * 0.75) * (1 - settle * 0.25)),
    );

    // Soft bounds — keep mass on screen without hard walls
    const boundX = 2.6;
    const boundY = 1.85;

    let segIndex = 0;

    for (let a = 0; a < activeCount; a++) {
      const agent = agents[a];
      const angle = flowAngle(agent.x, agent.y, agent.z, time);
      // Secondary curl for organic intention
      const curl =
        Math.sin(time * 0.27 + agent.id * 0.17) * 0.35 * weave +
        Math.cos(time * 0.19 + agent.hueBias) * 0.2 * awaken;
      const theta = angle + curl;
      const step = 0.028 * speedScale * agent.speedBias;

      agent.x += Math.cos(theta) * step;
      agent.y += Math.sin(theta) * step * 0.92;
      agent.z +=
        Math.sin(theta * 1.3 + time * 0.2 + agent.id * 0.05) * step * 0.35;

      // Soft wrap / fold back into frame
      if (agent.x > boundX) agent.x = -boundX + (agent.x - boundX) * 0.15;
      if (agent.x < -boundX) agent.x = boundX + (agent.x + boundX) * 0.15;
      if (agent.y > boundY) agent.y = -boundY + (agent.y - boundY) * 0.15;
      if (agent.y < -boundY) agent.y = boundY + (agent.y + boundY) * 0.15;
      agent.z *= 0.992;

      pushTrail(agent);

      // Palette: cream/warm + soft secondary hues — tasteful, not neon spam
      const baseHue =
        28 +
        Math.sin(time * 0.11 + agent.hueBias * 0.017) * 42 +
        Math.cos(time * 0.07 + agent.id * 0.04) * 28 +
        weave * 18;
      const sat =
        (0.22 + weave * 0.32 - settle * 0.14) *
        (0.75 + 0.25 * Math.sin(time * 0.15 + agent.id));
      const light =
        0.52 +
        awaken * 0.18 -
        settle * 0.06 +
        Math.sin(time * 0.21 + agent.hueBias) * 0.04;

      const filled = Math.min(agent.trailFilled, trailVis);
      if (filled < 2) continue;

      for (let s = 0; s < filled - 1; s++) {
        if (segIndex >= MAX_SEGMENTS) break;

        // Trail age: 0 = oldest drawn, 1 = newest
        const age = s / (filled - 1);
        const fade = age * age; // soft ink falloff toward tip
        const alphaBoost = (0.18 + weave * 0.55 + settle * 0.12) * fade * awaken;

        // Sample ring buffer from oldest of visible window to newest
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

        const hue = baseHue + age * 12;
        const [r, g, b] = hslToRgb(
          hue,
          Math.min(0.55, Math.max(0.08, sat)),
          Math.min(0.82, Math.max(0.28, light + age * 0.12)),
        );
        // Bake opacity into colour (LineBasicMaterial has no per-vertex alpha)
        const dim = Math.min(1, alphaBoost);
        colors[base] = r * dim;
        colors[base + 1] = g * dim;
        colors[base + 2] = b * dim;
        colors[base + 3] = r * Math.min(1, dim * 1.15);
        colors[base + 4] = g * Math.min(1, dim * 1.15);
        colors[base + 5] = b * Math.min(1, dim * 1.15);

        segIndex += 1;
      }
    }

    // Clear unused segment slots so leftovers don't ghost
    for (let s = segIndex; s < MAX_SEGMENTS; s++) {
      const base = s * 6;
      for (let k = 0; k < 6; k++) {
        positions[base + k] = 0;
        colors[base + k] = 0;
      }
    }

    lineGeo.setDrawRange(0, segIndex * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // Global material opacity eases with story
    lineMat.opacity = 0.55 + weave * 0.35 - settle * 0.08;

    const live = 1 - settle * 0.7;
    camera.position.x = Math.sin(time * 0.1) * 0.08 * live;
    camera.position.y = Math.cos(time * 0.08) * 0.05 * live;
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
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
