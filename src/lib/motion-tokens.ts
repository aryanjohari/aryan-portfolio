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
