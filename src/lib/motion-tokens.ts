/**
 * Shared motion language for UI animations (GSAP + CSS).
 *
 * Use MOTION.fast / .medium / .slow + .ease for new work.
 * Boot theatre and name scramble keep longer cinematic timings under
 * MOTION.boot / MOTION.scramble — do not force those into medium.
 *
 * Tokens never override a11y: callers must still gate with
 * prefersReducedMotion() (skip or zero-duration) as today.
 */

export const MOTION = {
  /** hovers, presses, small UI */
  fast: 0.2,
  /** fades, panels, most enters */
  medium: 0.45,
  /** larger section / page-ish moves */
  slow: 0.6,
  /** default GSAP ease */
  ease: "power2.out",
  easeInOut: "power2.inOut",

  /**
   * Home ↔ site void-chrome morph — a touch slower than `slow` so the
   * Flip reads intentional. Same duration both directions.
   */
  chrome: {
    morph: 0.9,
    ease: "power2.inOut" as const,
    /** Soft fade of page content before morph (→home) or after push (←home) */
    content: 0.5,
    /** Narrow/coarse crossfade halves */
    crossfade: 0.45,
    /** Site ↔ site page exit (opacity + slight y) before push */
    pageExit: 0.28,
    /** Site ↔ site page entry after pathname settle */
    pageEnter: 0.4,
  },

  /**
   * Home name scramble — cinematic; longer than medium/slow.
   * Do not shorten to MOTION.medium.
   */
  scramble: {
    duration: 2.15,
    ease: "power2.out" as const,
  },

  /**
   * Boot theatre clock — cinematic; own longer timings.
   * Do not shorten exit/content to MOTION.medium.
   */
  boot: {
    typeDurations: [0.95, 1.45, 0.7] as const,
    hold: 1.2,
    wipe: 0.3,
    finalLinger: 1.3,
    /** Soft reveal of home under aligned ask-bar frame */
    exitHold: 0.4,
    exitFade: 1.15,
    skipFade: 0.35,
    /** Fade typed line during linger so ask bar reveals in the same spot */
    textCrossfade: 0.55,
  },

  /**
   * Workshop Three.js edge-glow tablet carousel (drag/snap; no page pin).
   * World-unit spacing / depth; paces still use fast/medium + ease.
   * Material / geo / DPR tunables live here — no magic numbers in the stage.
   */
  workshop: {
    /** Horizontal spacing between slab centers (world units) */
    spacing: 4.9,
    /** How far neighbors push back on Z per index distance */
    zOffset: 1.6,
    /** Max neighbor rotateY (deg) */
    coverflowAngle: 46,
    /** Per-index-distance rotateY (deg); clamped by coverflowAngle */
    coverflowAngleStep: 21,
    /** Max pointer-follow hover tilt (deg) on enhanced desktop */
    hoverTiltMax: 7,
    /** Per-frame lerp toward hover target (1 = snap) */
    hoverTiltEase: 0.22,
    /** Stop hover easing when |delta| below this (deg) */
    hoverTiltEpsilon: 0.02,
    /** Tiny rotX breathe (deg) while hover is catching up — not a continuous idle loop */
    breatheAmp: 0.28,
    /** Active tablet resting tilt — enough to show thickness, not a pose */
    activeRestTiltX: -1.6,
    activeRestTiltY: 2.8,
    /** Pointer pulls key/rim lights (world units per hover deg fraction) */
    pointerLightPull: 0.045,
    /** Active-slab envMapIntensity boost at full hover deflection */
    pointerEnvBoost: 0.55,
    /** GSAP snap duration after drag release (seconds) */
    snapDuration: 0.55,
    /** Drag: pixels of horizontal movement → one index step */
    dragSensitivity: 280,
    /** Pointer movement (px) before a gesture counts as drag, not click */
    dragThreshold: 8,

    /**
     * Camera fit — dolly so the active tablet fills these frame fractions
     * (whichever axis binds), clamped to a sane dolly range. Keeps the
     * carousel proportionate on short desktop stages and phones alike.
     */
    fitWidthFrac: 0.6,
    fitHeightFrac: 0.68,
    cameraZMin: 5.15,
    cameraZMax: 10,

    /**
     * Entrance — rim ignite + depth assemble (skips under reduced-motion
     * because ProjectGallery uses the DOM fallback there). Exit is a short
     * rim extinguish when the canvas is still connected.
     */
    enterRimDuration: 0.5,
    enterContentDelay: 0.22,
    enterContentDuration: 0.36,
    enterAssembleDuration: 0.7,
    /** Start spacing as a fraction of rested spacing (tighter → fan out) */
    enterSpacingFrac: 0.55,
    /** Start z-push multiplier (deeper → settle forward) */
    enterZMul: 1.55,
    /** Extra coverflow angle multiplier at t=0 */
    enterAngleMul: 1.35,
    /** Active tablet starts this far back (world units) and settles to 0 */
    enterActiveZPush: 0.85,
    exitDuration: 0.22,

    /** Renderer DPR caps — sharper type/edges without exploding dual-canvas cost */
    dprEnhanced: 2,
    dprDefault: 1.35,
    /** Content CanvasTexture CSS size (px); painted once on content/DPR change */
    texCssWEnhanced: 640,
    texCssHEnhanced: 408,
    texCssWDefault: 360,
    texCssHDefault: 230,
    /** Extrude / shape segment budgets — soft chips need few segs */
    curveSegmentsEnhanced: 2,
    curveSegmentsDefault: 1,
    bevelSegmentsEnhanced: 2,
    bevelSegmentsDefault: 1,
    bevelThicknessEnhanced: 0.07,
    bevelThicknessDefault: 0.055,
    bevelSizeEnhanced: 0.06,
    bevelSizeDefault: 0.045,

    /**
     * Edge-glow tablet: Fresnel silhouette plates + beveled rim contour.
     * Cream type floats on void. No tinted fill, no splash, no transmission.
     */
    plateDepthEnhanced: 0.08,
    plateDepthDefault: 0.06,
    /** Type plane Z — mid-volume */
    contentZ: 0.02,
    /** Plate Fresnel colour (ShaderMaterial silhouette) */
    backColor: 0xf4f0e8,
    frontColor: 0xf4f0e8,
    /** Kept for docs / future plate PBR; plates are shader-only today */
    frontClearcoatRoughness: 0.03,
    /**
     * Void shade — flat near-black pane at the rear of each tablet. The
     * Workshop canvas composites over the Atmosphere canvas, so this quiets
     * the trail *behind* the body and the stack reads as depth. Black (not
     * grey) so it deepens toward the void instead of tinting the glass.
     */
    shadeColor: 0x04050a,
    shadeOpacity: 0.42,
    shadeNeighborOpacity: 0.26,
    /** Rim — primary light-drawn contour */
    rimWidth: 0.042,
    rimColor: 0xf4f0e8,
    rimOpacity: 0.78,
    rimRoughness: 0.05,
    rimBumpScale: 0.012,
    rimEmissive: 0.22,
    rimEnvIntensityEnhanced: 3.8,
    rimEnvIntensityDefault: 2.6,
    /** Fresnel contour (pow + alpha) on plates; mild inject on rim */
    fresnelPower: 2.35,
    fresnelIntensityEnhanced: 1.15,
    fresnelIntensityDefault: 0.9,
    fresnelEmissiveEnhanced: 1.05,
    fresnelEmissiveDefault: 0.72,
    /** Neighbor fade — contour + type must not muddy the active tablet */
    neighborContentFade: 0.48,
    neighborContentFloor: 0.18,
    neighborGlassFade: 0.28,
    neighborGlassFloor: 0.42,
    /** Mild thin-film on rim only; enhanced desktop */
    iridescence: 0.28,
    iridescenceIOR: 1.3,
    iridescenceThicknessMin: 120,
    iridescenceThicknessMax: 320,
    bumpMapSizeEnhanced: 256,
    bumpMapSizeDefault: 128,
    envIntensityEnhanced: 1.05,
    envIntensityDefault: 0.8,
  },
} as const;

export type MotionPace = "fast" | "medium" | "slow";

/** GSAP duration in seconds for a standard pace. */
export function motionDuration(pace: MotionPace): number {
  return MOTION[pace];
}

/** CSS duration string (e.g. `"0.45s"`) mirroring MOTION paces. */
export function motionDurationCss(pace: MotionPace): `${number}s` {
  return `${MOTION[pace]}s`;
}
