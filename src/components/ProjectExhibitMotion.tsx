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

/** Tunables — hero entry + exit-to-void; architecture follows in document flow. */
const HERO = {
  titleStagger: 0.045,
  titleDuration: 0.55,
  ledeStagger: 0.07,
  ledeDuration: 0.5,
  badgeDuration: 0.4,
  buttonStagger: 0.055,
  buttonDuration: 0.4,
  /** Delay (s) before title after badge start */
  titleAt: 0.06,
  /** Delay (s) before buttons after badge start */
  buttonsAt: 0.18,
  /** Delay (s) before lede lines after badge start */
  ledeAt: 0.32,
  exitScrub: 0.45,
  /** Short pin distance for exit beat (~viewport fraction) */
  exitPinEnd: "+=42%",
  hoverX: 3,
  hoverDuration: MOTION.fast,
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
      const [gsapMod, stMod, splitMod] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      if (cancelled || !root) return;

      const gsap = gsapMod.default;
      const { ScrollTrigger } = stMod;
      const { SplitText } = splitMod;
      gsap.registerPlugin(ScrollTrigger, SplitText);

      try {
        await document.fonts.ready;
      } catch {
        /* proceed with fallback metrics */
      }
      if (cancelled || !root) return;

      const hero = root.querySelector<HTMLElement>('[data-exhibit-act="hero"]');
      const badge = root.querySelector<HTMLElement>("[data-exhibit-hero-badge]");
      const title = root.querySelector<HTMLElement>("[data-exhibit-hero-title]");
      const lede = root.querySelector<HTMLElement>("[data-exhibit-hero-lede]");
      const actions = root.querySelector<HTMLElement>("[data-exhibit-actions]");
      const buttons = actions
        ? Array.from(actions.querySelectorAll<HTMLElement>(".project-exhibit-action"))
        : [];
      const rest = root.querySelector<HTMLElement>("[data-exhibit-rest]");
      const voidEl = root.querySelector<HTMLElement>("[data-exhibit-void]");

      const heroPieces = [badge, title, lede, actions].filter(
        (el): el is HTMLElement => Boolean(el),
      );

      const setHeroFinal = () => {
        if (heroPieces.length) {
          gsap.set(heroPieces, { autoAlpha: 1, x: 0, y: 0, clearProps: "transform" });
        }
        if (buttons.length) gsap.set(buttons, { autoAlpha: 1, x: 0, y: 0 });
      };

      /** Reduced-motion / a11y: skills + coda readable in the document. */
      const setRestVisible = () => {
        if (rest) {
          rest.hidden = false;
          rest.classList.remove("project-exhibit-rest--dormant");
        }
        if (voidEl) {
          voidEl.style.minHeight = "0";
          voidEl.hidden = true;
        }
      };

      /** Motion path: hold skills/coda; architecture sits after void in the flow. */
      const setRestDormant = () => {
        if (rest) {
          rest.hidden = true;
          rest.classList.add("project-exhibit-rest--dormant");
        }
        if (voidEl) {
          voidEl.hidden = false;
          voidEl.style.minHeight = "";
        }
      };

      ctx = gsap.context(() => {
        mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: reduce)", () => {
          setHeroFinal();
          setRestVisible();
        });

        mm.add(
          "(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (pointer: fine)",
          () => {
            setRestDormant();

            if (hero) {
              addHeroEntry(gsap, SplitText, { badge, title, lede, buttons });
              addHeroExit(gsap, hero, { badge, title, lede, actions }, { pin: true });
            } else {
              setHeroFinal();
            }

            const unbindHover = buttons.length > 0 ? bindButtonHovers(gsap, buttons) : null;
            return () => {
              unbindHover?.();
            };
          },
        );

        mm.add(
          "(prefers-reduced-motion: no-preference) and ((max-width: 1023px) or (pointer: coarse))",
          () => {
            setRestDormant();

            if (hero) {
              addHeroEntry(gsap, SplitText, { badge, title, lede, buttons });
              addHeroExit(gsap, hero, { badge, title, lede, actions }, { pin: false });
            } else {
              setHeroFinal();
            }

            const unbindHover = buttons.length > 0 ? bindButtonHovers(gsap, buttons) : null;
            return () => {
              unbindHover?.();
            };
          },
        );
      }, root);

      ScrollTrigger.refresh();
    }

    void setup();

    return () => {
      cancelled = true;
      mm?.revert();
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="project-exhibit-motion">
      {children}
    </div>
  );
}

function addHeroEntry(
  gsap: GsapLike,
  SplitText: SplitTextLike,
  els: {
    badge: HTMLElement | null;
    title: HTMLElement | null;
    lede: HTMLElement | null;
    buttons: HTMLElement[];
  },
) {
  const { badge, title, lede, buttons } = els;

  if (badge) gsap.set(badge, { autoAlpha: 0, y: 10 });
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

  if (badge) {
    tl.to(
      badge,
      { autoAlpha: 1, y: 0, duration: HERO.badgeDuration },
      0,
    );
  }

  if (titleSplit?.words?.length) {
    tl.to(
      titleSplit.words,
      {
        autoAlpha: 1,
        y: 0,
        duration: HERO.titleDuration,
        stagger: HERO.titleStagger,
      },
      HERO.titleAt,
    );
  } else if (title) {
    tl.to(
      title,
      { autoAlpha: 1, y: 0, duration: HERO.titleDuration },
      HERO.titleAt,
    );
  }

  if (buttons.length) {
    tl.to(
      buttons,
      {
        autoAlpha: 1,
        y: 0,
        duration: HERO.buttonDuration,
        stagger: HERO.buttonStagger,
      },
      HERO.buttonsAt,
    );
  }

  if (ledeSplit?.lines?.length) {
    tl.to(
      ledeSplit.lines,
      {
        autoAlpha: 1,
        y: 0,
        duration: HERO.ledeDuration,
        stagger: HERO.ledeStagger,
      },
      HERO.ledeAt,
    );
  } else if (lede) {
    tl.to(
      lede,
      { autoAlpha: 1, y: 0, duration: HERO.ledeDuration },
      HERO.ledeAt,
    );
  }
}

function addHeroExit(
  gsap: GsapLike,
  hero: HTMLElement,
  els: {
    badge: HTMLElement | null;
    title: HTMLElement | null;
    lede: HTMLElement | null;
    actions: HTMLElement | null;
  },
  opts: { pin: boolean },
) {
  const { badge, title, lede, actions } = els;
  const exitTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: opts.pin ? HERO.exitPinEnd : "bottom top",
      scrub: HERO.exitScrub,
      pin: opts.pin,
      pinSpacing: opts.pin,
      refreshPriority: 1,
    },
  });

  if (badge) {
    exitTl.to(badge, { autoAlpha: 0, x: -28, y: -10, duration: 1 }, 0);
  }
  if (title) {
    exitTl.to(title, { autoAlpha: 0, x: -56, duration: 1 }, 0.04);
  }
  if (actions) {
    exitTl.to(actions, { autoAlpha: 0, x: 48, duration: 1 }, 0.04);
  }
  if (lede) {
    exitTl.to(lede, { autoAlpha: 0, y: 40, duration: 1 }, 0.1);
  }
}

function bindButtonHovers(gsap: GsapLike, buttons: HTMLElement[]): () => void {
  const cleanups: Array<() => void> = [];

  for (const btn of buttons) {
    const nudgeIn = () => {
      gsap.to(btn, {
        x: HERO.hoverX,
        duration: HERO.hoverDuration,
        ease: MOTION.ease,
        overwrite: "auto",
      });
    };
    const nudgeOut = () => {
      gsap.to(btn, {
        x: 0,
        duration: HERO.hoverDuration,
        ease: MOTION.ease,
        overwrite: "auto",
      });
    };
    const onFocus = () => {
      if (btn.matches(":focus-visible")) nudgeIn();
    };

    btn.addEventListener("pointerenter", nudgeIn);
    btn.addEventListener("pointerleave", nudgeOut);
    btn.addEventListener("focus", onFocus);
    btn.addEventListener("blur", nudgeOut);

    cleanups.push(() => {
      btn.removeEventListener("pointerenter", nudgeIn);
      btn.removeEventListener("pointerleave", nudgeOut);
      btn.removeEventListener("focus", onFocus);
      btn.removeEventListener("blur", nudgeOut);
      gsap.killTweensOf(btn);
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
