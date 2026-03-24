export type ModelLayoutProps = {
  /** Offset in the scaled model root (inside `Model`’s auto-fit scale) — stable across resize */
  layoutOffset?: readonly [number, number, number];
  rotationY?: number;
  fitTarget?: number;
  innerGroupPosition?: readonly [number, number, number];
  /** World point for auto-scale depth; omit to use scene `lookAt` from SceneWrapper */
  framingTarget?: readonly [number, number, number];
};

/** Full-viewport landing — head/upper body in frame, slight low angle, right-weighted */
export const heroFraming = {
  cameraPosition: [0.92, 8.7, 3.52] as const,
  fov: 38,
  lookAt: [0.1, 1.62, 0] as const,
  model: {
    layoutOffset: [0.82, -0.12, 0] as const,
    rotationY: 0.42,
    fitTarget: 1.04,
    innerGroupPosition: [0, -0.95, 0] as const,
  } satisfies ModelLayoutProps,
} as const;

/** Neutral framing for `/scene` loader smoke test */
export const testSceneFraming = {
  cameraPosition: [0, 1.5, 4] as const,
  fov: 45,
  lookAt: [0, 1.1, 0] as const,
  model: {
    fitTarget: 0.9,
    innerGroupPosition: [0, -1.5, 0] as const,
  } satisfies ModelLayoutProps,
} as const;
