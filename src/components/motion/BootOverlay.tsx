"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  canUseEnhancedMotion,
  canUseTheatreMotion,
  MOTION,
  removeBootCover,
  signalBootDone,
} from "@/lib/motion";

import type { BootFieldHandle } from "./BootField";

const BEATS = [
  "it's craft, not code.",
  "made with intention, not scripts.",
  "hi — i'm aryan.",
] as const;

const BG = "#0a0a0a";
const FG = "#f4f0e8";

/** Type → hold → wipe → next; content (~7.4s) + soft exit hold/fade — MOTION.boot */
const TYPE_DURATIONS = MOTION.boot.typeDurations;
const HOLD = MOTION.boot.hold;
const WIPE = MOTION.boot.wipe;
const FINAL_LINGER = MOTION.boot.finalLinger;
const EXIT_HOLD = MOTION.boot.exitHold;
const EXIT_FADE = MOTION.boot.exitFade;
const SKIP_FADE = MOTION.boot.skipFade;
const TEXT_CROSSFADE = MOTION.boot.textCrossfade;

const CONTENT_DURATION =
  TYPE_DURATIONS.reduce((sum, d) => sum + d, 0) +
  HOLD * 2 +
  WIPE * 2 +
  FINAL_LINGER;

const DENSE_BUDGET = { agentCount: 160, trailLen: 24, maxDpr: 2 } as const;
const LIGHT_BUDGET = { agentCount: 80, trailLen: 14, maxDpr: 1.5 } as const;

function isCoarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Boot theatre: dark overlay, typed craft lines, void roam → one center
 * frame → ask-bar morph. Runs on all viewports unless reduced-motion.
 * Shared clock with BootField. Soft exit hold then fade so home (same void
 * + ask) reads continuous. Unmounts after.
 */
export function BootOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const fieldHostRef = useRef<HTMLDivElement>(null);
  const lineWrapRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const fieldRef = useRef<BootFieldHandle | null>(null);
  const progressRef = useRef({ value: 0 });
  const skippingRef = useRef(false);

  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const [hintLabel, setHintLabel] = useState("click to enter");

  useEffect(() => {
    const ok = canUseTheatreMotion();
    if (!ok) {
      removeBootCover();
      setActive(false);
      setDone(true);
    } else {
      setActive(true);
      setHintLabel(isCoarsePointer() ? "tap to enter" : "click to enter");
    }

    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!canUseTheatreMotion()) {
        removeBootCover();
        setActive(false);
        setDone(true);
      }
    };
    mqMotion.addEventListener("change", sync);

    return () => {
      mqMotion.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (done) signalBootDone();
  }, [done]);

  useLayoutEffect(() => {
    if (!active || done) return;
    removeBootCover();
  }, [active, done]);

  useEffect(() => {
    if (!active || done) return;
    const overlay = overlayRef.current;
    const fieldHost = fieldHostRef.current;
    const textEl = textRef.current;
    const cursorEl = cursorRef.current;
    const hintEl = hintRef.current;
    const lineWrap = lineWrapRef.current;
    if (
      !overlay ||
      !fieldHost ||
      !textEl ||
      !cursorEl ||
      !hintEl ||
      !lineWrap
    ) {
      return;
    }

    let cancelled = false;
    let timeline: { kill: () => void } | undefined;
    let exitTween: { kill: () => void } | undefined;
    let cursorTween: { kill: () => void } | undefined;
    let exitDelay: { kill: () => void } | undefined;

    /** Pin typed line to measured ask bar so morph shares the same center. */
    const syncLineToAsk = () => {
      const ask = document.querySelector(".portfolio-guide-float");
      const wrap = lineWrapRef.current;
      const overlayEl = overlayRef.current;
      if (!ask || !wrap || !overlayEl) return false;
      const r = ask.getBoundingClientRect();
      const host = overlayEl.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      wrap.style.left = `${r.left + r.width * 0.5 - host.left}px`;
      wrap.style.top = `${r.top + r.height * 0.5 - host.top}px`;
      return true;
    };

    const finish = () => {
      if (!cancelled) setDone(true);
    };

    const exit = (duration: number) => {
      if (cancelled || skippingRef.current || !overlayRef.current) return;
      skippingRef.current = true;
      timeline?.kill();
      cursorTween?.kill();
      void import("gsap").then(({ gsap }) => {
        if (cancelled || !overlayRef.current) return;
        exitTween?.kill();
        exitTween = gsap.to(overlayRef.current, {
          opacity: 0,
          duration,
          ease: MOTION.ease,
          onComplete: finish,
        });
      });
    };

    const skip = () => exit(SKIP_FADE);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    };

    const onResize = () => {
      syncLineToAsk();
    };

    overlay.addEventListener("click", skip);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    void (async () => {
      const [{ gsap }, { createBootField }] = await Promise.all([
        import("gsap"),
        import("./BootField"),
      ]);
      if (
        cancelled ||
        skippingRef.current ||
        !fieldHostRef.current ||
        !overlayRef.current ||
        !textRef.current ||
        !cursorRef.current ||
        !hintRef.current ||
        !lineWrapRef.current
      ) {
        return;
      }

      progressRef.current.value = 0;

      // Align typed line to ask before field measures [data-boot-line]
      await new Promise<void>((resolve) => {
        let tries = 0;
        const tick = () => {
          if (cancelled || syncLineToAsk() || tries >= 8) {
            resolve();
            return;
          }
          tries += 1;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(() => requestAnimationFrame(tick));
      });
      if (cancelled || skippingRef.current) return;

      const dense = canUseEnhancedMotion();
      const budget = dense ? DENSE_BUDGET : LIGHT_BUDGET;

      const field = await createBootField(fieldHostRef.current, {
        getProgress: () => progressRef.current.value,
        ...budget,
      });
      if (cancelled || skippingRef.current) {
        field.dispose();
        return;
      }
      fieldRef.current = field;
      syncLineToAsk();

      const lineEl = textRef.current;
      const curEl = cursorRef.current;
      const hint = hintRef.current;
      const wrap = lineWrapRef.current;

      lineEl.textContent = "";
      gsap.set(hint, { opacity: 0 });
      gsap.set(curEl, { opacity: 1 });
      gsap.set(wrap, { opacity: 1 });

      cursorTween = gsap.to(curEl, {
        opacity: 0.15,
        duration: 0.45,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      });

      const tl = gsap.timeline({
        onComplete: () => {
          cursorTween?.kill();
          gsap.set(curEl, { opacity: 0 });
          // Hold last aligned frame, then soft crossfade into home
          exitDelay?.kill();
          exitDelay = gsap.delayedCall(EXIT_HOLD, () => {
            if (!cancelled && !skippingRef.current) exit(EXIT_FADE);
          });
        },
      });
      timeline = tl;

      tl.to(
        progressRef.current,
        {
          value: 1,
          duration: CONTENT_DURATION,
          ease: "none",
        },
        0,
      );

      tl.to(hint, { opacity: 0.35, duration: 0.65, ease: "power1.out" }, 0.3);

      let at = 0;
      BEATS.forEach((beat, i) => {
        const typeDur = TYPE_DURATIONS[i];
        const typed = { n: 0 };
        const labels = ["voidRoam", "voidWeave", "centerFrame"] as const;

        tl.addLabel(labels[i], at);
        tl.to(
          typed,
          {
            n: beat.length,
            duration: typeDur,
            ease: "none",
            onUpdate: () => {
              lineEl.textContent = beat.slice(0, Math.floor(typed.n));
            },
            onComplete: () => {
              lineEl.textContent = beat;
            },
          },
          at,
        );
        at += typeDur;

        if (i < BEATS.length - 1) {
          tl.to({}, { duration: HOLD }, at);
          at += HOLD;
          tl.call(
            () => {
              lineEl.textContent = "";
            },
            undefined,
            at,
          );
          tl.to({}, { duration: WIPE }, at);
          at += WIPE;
        } else {
          // Crossfade typed line → ask bar while particles morph the frame
          const fadeStart = at + Math.max(0, FINAL_LINGER - TEXT_CROSSFADE);
          tl.to(
            wrap,
            {
              opacity: 0,
              duration: TEXT_CROSSFADE,
              ease: MOTION.easeInOut,
            },
            fadeStart,
          );
          tl.to(
            hint,
            { opacity: 0, duration: 0.35, ease: "power1.out" },
            fadeStart,
          );
          tl.to({}, { duration: FINAL_LINGER }, at);
        }
      });
    })();

    return () => {
      cancelled = true;
      timeline?.kill();
      exitTween?.kill();
      exitDelay?.kill();
      cursorTween?.kill();
      overlay.removeEventListener("click", skip);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      fieldRef.current?.dispose();
      fieldRef.current = null;
    };
  }, [active, done]);

  if (!active || done) return null;

  return (
    <div
      ref={overlayRef}
      role="presentation"
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        width: "100%",
        height: "100dvh",
        backgroundColor: BG,
        color: FG,
        opacity: 1,
        cursor: "pointer",
        overflow: "hidden",
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        boxSizing: "border-box",
      }}
    >
      <div
        ref={fieldHostRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Anchored to ask-bar center so frame → input reads as one object */}
        <p
          ref={lineWrapRef}
          data-boot-line
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            margin: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize:
              "clamp(0.85rem, 1.6vw + 0.5rem + 0.35vh, 1.65rem)",
            lineHeight: 1.45,
            letterSpacing: "0.01em",
            fontWeight: 400,
            color: FG,
            maxWidth: "min(36rem, 90vw)",
            width: "max-content",
            padding: "0 clamp(1rem, 4vw, 2rem)",
            boxSizing: "border-box",
          }}
        >
          <span ref={textRef} />
          <span
            ref={cursorRef}
            aria-hidden
            style={{
              display: "inline-block",
              marginLeft: "0.06em",
              opacity: 1,
              color: FG,
            }}
          >
            ▍
          </span>
        </p>

        <p
          ref={hintRef}
          style={{
            position: "absolute",
            bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            left: 0,
            right: 0,
            margin: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "clamp(0.65rem, 0.9vw + 0.4rem, 0.8rem)",
            letterSpacing: "0.06em",
            color: FG,
            opacity: 0,
            paddingInline: "1rem",
          }}
        >
          {hintLabel}
        </p>
      </div>
    </div>
  );
}
