"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { MOTION } from "@/lib/motion";

type ProjectExhibitMotionProps = {
  children: ReactNode;
};

type MatchMediaHandle = {
  add: (query: string, handler: () => void) => unknown;
  revert: () => void;
};

type GsapLike = typeof import("gsap").default;
type SplitTextLike = typeof import("gsap/SplitText").SplitText;

/**
 * Soft hero entry only — no exit theatre, no pin/scrub handoff.
 * Animation polish (showcase handoffs) deferred to a later pass.
 */
export const HERO_ENTRY = {
  titleStaggerIn: 0.045,
  titleDuration: 0.55,
  ledeStaggerIn: 0.07,
  ledeDuration: 0.5,
  buttonStaggerIn: 0.055,
  buttonDuration: 0.4,
  titleAt: 0,
  buttonsAt: 0.12,
  ledeAt: 0.26,
} as const;

export function ProjectExhibitMotion({ children }: ProjectExhibitMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let ctx: { revert: () => void } | null = null;
    let mm: MatchMediaHandle | null = null;
    let cancelled = false;

    async function setup() {
      const [gsapMod, splitMod] = await Promise.all([
        import("gsap"),
        import("gsap/SplitText"),
      ]);
      if (cancelled || !root) return;

      const gsap = gsapMod.default;
      const { SplitText } = splitMod;
      gsap.registerPlugin(SplitText);

      try {
        await document.fonts.ready;
      } catch {
        /* proceed with fallback metrics */
      }
      if (cancelled || !root) return;

      const title = root.querySelector<HTMLElement>("[data-exhibit-hero-title]");
      const lede = root.querySelector<HTMLElement>("[data-exhibit-hero-lede]");
      const actions = root.querySelector<HTMLElement>("[data-exhibit-actions]");
      const buttons = actions
        ? Array.from(actions.querySelectorAll<HTMLElement>(".project-exhibit-action"))
        : [];

      const heroPieces = [title, lede, actions].filter(
        (el): el is HTMLElement => Boolean(el),
      );

      const setHeroFinal = () => {
        if (heroPieces.length) {
          gsap.set(heroPieces, { autoAlpha: 1, x: 0, y: 0, clearProps: "transform" });
        }
        if (buttons.length) gsap.set(buttons, { autoAlpha: 1, x: 0, y: 0 });
      };

      ctx = gsap.context(() => {
        mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: reduce)", () => {
          setHeroFinal();
        });

        mm.add("(prefers-reduced-motion: no-preference)", () => {
          addHeroEntry(gsap, SplitText, { title, lede, buttons });
        });
      }, root);
    }

    void setup();

    return () => {
      cancelled = true;
      mm?.revert();
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="project-exhibit-motion" data-void-scroll>
      {children}
    </div>
  );
}

function addHeroEntry(
  gsap: GsapLike,
  SplitText: SplitTextLike,
  els: {
    title: HTMLElement | null;
    lede: HTMLElement | null;
    buttons: HTMLElement[];
  },
) {
  const { title, lede, buttons } = els;

  if (title) gsap.set(title, { autoAlpha: 1 });
  if (lede) gsap.set(lede, { autoAlpha: 1 });
  if (buttons.length) gsap.set(buttons, { autoAlpha: 0, y: 12 });

  let titleSplit: InstanceType<SplitTextLike> | null = null;
  let ledeSplit: InstanceType<SplitTextLike> | null = null;

  try {
    if (title) {
      titleSplit = SplitText.create(title, {
        type: "words",
        wordsClass: "project-exhibit-split-word",
      });
      gsap.set(titleSplit.words, { autoAlpha: 0, y: 18 });
    }
  } catch {
    titleSplit = null;
    if (title) gsap.set(title, { autoAlpha: 0, y: 18 });
  }

  try {
    if (lede) {
      ledeSplit = SplitText.create(lede, {
        type: "lines",
        mask: "lines",
        linesClass: "project-exhibit-split-line",
      });
      gsap.set(ledeSplit.lines, { autoAlpha: 0, y: 22 });
    }
  } catch {
    ledeSplit = null;
    if (lede) gsap.set(lede, { autoAlpha: 0, y: 18 });
  }

  const tl = gsap.timeline({ defaults: { ease: MOTION.ease } });

  if (titleSplit?.words?.length) {
    tl.to(
      titleSplit.words,
      {
        autoAlpha: 1,
        y: 0,
        duration: HERO_ENTRY.titleDuration,
        stagger: HERO_ENTRY.titleStaggerIn,
      },
      HERO_ENTRY.titleAt,
    );
  } else if (title) {
    tl.to(title, { autoAlpha: 1, y: 0, duration: HERO_ENTRY.titleDuration }, HERO_ENTRY.titleAt);
  }

  if (buttons.length) {
    tl.to(
      buttons,
      {
        autoAlpha: 1,
        y: 0,
        duration: HERO_ENTRY.buttonDuration,
        stagger: HERO_ENTRY.buttonStaggerIn,
      },
      HERO_ENTRY.buttonsAt,
    );
  }

  if (ledeSplit?.lines?.length) {
    tl.to(
      ledeSplit.lines,
      {
        autoAlpha: 1,
        y: 0,
        duration: HERO_ENTRY.ledeDuration,
        stagger: HERO_ENTRY.ledeStaggerIn,
      },
      HERO_ENTRY.ledeAt,
    );
  } else if (lede) {
    tl.to(lede, { autoAlpha: 1, y: 0, duration: HERO_ENTRY.ledeDuration }, HERO_ENTRY.ledeAt);
  }
}
