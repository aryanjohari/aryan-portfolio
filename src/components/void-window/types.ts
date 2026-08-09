import type { ReactNode } from "react";

/** Which exhibit surface the matte is hosting. */
export type MatteSurfaceId = "proof" | "architecture";

/** Inline plate skim vs expanded dive. */
export type MatteLayer = "plate" | "dive";

/**
 * How heavy tools render inside a matte:
 * - canvas: diagram/iframe only (inline plate skim)
 * - tools: canvas + navigation chrome (dive)
 * - full: legacy page-owned chrome (headers + tools)
 */
export type SurfacePresentation = "canvas" | "tools" | "full";

export type MattePanelProps = {
  title: string;
  /** Quiet whisper under the skim canvas. */
  invitation: string;
  onDive: () => void;
  onClose?: () => void;
  /** Clipped live preview / interactive dive surface. */
  children?: ReactNode;
  className?: string;
  layer?: MatteLayer;
};
