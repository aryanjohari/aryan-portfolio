"use client";

import { useEffect } from "react";

import { MOTION, prefersReducedMotion } from "@/lib/motion";

export const VOID_SCROLL_SELECTOR = "[data-void-scroll]";
export const VOID_SCROLL_EXEMPT_SELECTOR = "[data-void-scroll-exempt]";

/** About readable blocks — continuous essay paragraphs + pullquote. */
export const ABOUT_VOID_SCROLL_BLOCKS =
  ".about-essay p, .about-pullquote";

/**
 * Slug exhibit readable blocks (hero kept out — ProjectExhibitMotion owns entry).
 * Nodes inside `[data-void-scroll-exempt]` are filtered out at setup.
 */
export const EXHIBIT_VOID_SCROLL_BLOCKS = [
  ".project-exhibit-stack",
  ".project-exhibit-case",
  ".exhibit-stage-header",
  ".exhibit-stage-col-copy",
  "[data-exhibit-rest] .content-notice",
  "[data-exhibit-rest] .project-exhibit-coda-nav",
].join(", ");

type VoidScrollDramaProps = {
  /** Selector for fade targets, scoped to the portal. */
  blocks: string;
  /** Override portal root; defaults to nearest `[data-void-scroll]`. */
  scroller?: string;
};

type ScrollTriggerLike = {
  disable: (revert?: boolean) => void;
  enable: () => void;
};

/**
 * Quiet bidirectional enter/leave fades for continuous void-scroll portals.
 * Edge dissolve stays CSS-only on `[data-void-scroll]`.
 * Pauses scrubbing while the pointer is over `[data-void-scroll-exempt]`.
 */
export function VoidScrollDrama({
  blocks,
  scroller = VOID_SCROLL_SELECTOR,
}: VoidScrollDramaProps) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const scrollport = document.querySelector<HTMLElement>(scroller);
    if (!scrollport) return;

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    async function setup() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !scrollport) return;

      gsap.registerPlugin(ScrollTrigger);

      if (cancelled || !scrollport) return;

      const blockEls = Array.from(
        scrollport.querySelectorAll<HTMLElement>(blocks),
      ).filter((el) => !el.closest(VOID_SCROLL_EXEMPT_SELECTOR));
      if (blockEls.length === 0) return;

      const triggers: ScrollTriggerLike[] = [];
      let paused = false;

      const setPaused = (next: boolean) => {
        if (paused === next) return;
        paused = next;
        for (const st of triggers) {
          if (next) st.disable(false);
          else st.enable();
        }
      };

      if (cancelled) return;

      ctx = gsap.context(() => {
        for (const el of blockEls) {
          const tl = gsap
            .timeline({
              scrollTrigger: {
                scroller: scrollport,
                trigger: el,
                /* Readable mid-band: fade in from below, out into the top dissolve */
                start: "top 90%",
                end: "top 16%",
                scrub: MOTION.voidScroll.blockScrub,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              el,
              { autoAlpha: 0, y: MOTION.voidScroll.blockEnterY },
              {
                autoAlpha: 1,
                y: 0,
                duration: MOTION.voidScroll.blockEdge,
                ease: "none",
              },
            )
            .to(el, {
              autoAlpha: 1,
              y: 0,
              duration: MOTION.voidScroll.blockHold,
              ease: "none",
            })
            .to(el, {
              autoAlpha: 0,
              y: MOTION.voidScroll.blockLeaveY,
              duration: MOTION.voidScroll.blockEdge,
              ease: "none",
            });

          const st = tl.scrollTrigger;
          if (st) triggers.push(st);
        }

        if (cancelled) return;

        const exemptRoots = scrollport.querySelectorAll<HTMLElement>(
          VOID_SCROLL_EXEMPT_SELECTOR,
        );
        for (const root of exemptRoots) {
          const onEnter = () => setPaused(true);
          const onLeave = () => setPaused(false);
          root.addEventListener("pointerenter", onEnter);
          root.addEventListener("pointerleave", onLeave);
          cleanups.push(() => {
            root.removeEventListener("pointerenter", onEnter);
            root.removeEventListener("pointerleave", onLeave);
          });
        }

        ScrollTrigger.refresh();
      }, scrollport);

      if (cancelled) {
        ctx.revert();
        ctx = null;
      }
    }

    void setup();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
      ctx?.revert();
    };
  }, [blocks, scroller]);

  return null;
}
