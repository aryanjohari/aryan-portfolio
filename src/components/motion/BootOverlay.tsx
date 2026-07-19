"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { canUseEnhancedMotion, removeBootCover } from "@/lib/motion";

import type { BootFieldHandle } from "./BootField";

const BEATS = [
  "it's craft, not code.",
  "made with intention, not scripts.",
  "hi — i'm aryan.",
] as const;

const BG = "#0a0a0a";
const FG = "#f4f0e8";

/** Type → hold → wipe → next; content (~7.4s) + exit ≈ 8s */
const TYPE_DURATIONS = [0.95, 1.45, 0.7] as const;
const HOLD = 1.2;
const WIPE = 0.3;
const FINAL_LINGER = 1.3;
const EXIT_FADE = 0.6;
const SKIP_FADE = 0.35;

const CONTENT_DURATION =
  TYPE_DURATIONS.reduce((sum, d) => sum + d, 0) +
  HOLD * 2 +
  WIPE * 2 +
  FINAL_LINGER;

/**
 * Desktop boot theatre: dark overlay, typed craft lines, silk→wireframe field.
 * Shared clock with BootField: GSAP drives `progressRef` (p 0→1) over
 * CONTENT_DURATION; field reads p every RAF via getProgress + its own t clock.
 * Beat1 void/weave · beat2 denser weave · beat3 converge to homepage wireframe / settle.
 * Unmounts after complete/skip. Mobile / reduced-motion / coarse pointer: null.
 */
export function BootOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const fieldHostRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const fieldRef = useRef<BootFieldHandle | null>(null);
  const progressRef = useRef({ value: 0 });
  const skippingRef = useRef(false);

  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const ok = canUseEnhancedMotion();
    if (!ok) {
      removeBootCover();
      setActive(false);
      setDone(true);
    } else {
      setActive(true);
    }

    const mqDesktop = window.matchMedia("(min-width: 1024px)");
    const mqPointer = window.matchMedia("(pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      if (!canUseEnhancedMotion()) {
        removeBootCover();
        setActive(false);
        setDone(true);
      }
    };
    mqDesktop.addEventListener("change", sync);
    mqPointer.addEventListener("change", sync);
    mqMotion.addEventListener("change", sync);

    return () => {
      mqDesktop.removeEventListener("change", sync);
      mqPointer.removeEventListener("change", sync);
      mqMotion.removeEventListener("change", sync);
    };
  }, []);

  // Same frame as dark BootOverlay paint — no cream flash under the cover
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
    if (!overlay || !fieldHost || !textEl || !cursorEl || !hintEl) {
      return;
    }

    let cancelled = false;
    let timeline: { kill: () => void } | undefined;
    let exitTween: { kill: () => void } | undefined;
    let cursorTween: { kill: () => void } | undefined;

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
          ease: "power2.out",
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

    overlay.addEventListener("click", skip);
    window.addEventListener("keydown", onKey);

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
        !hintRef.current
      ) {
        return;
      }

      progressRef.current.value = 0;
      const field = await createBootField(fieldHostRef.current, {
        getProgress: () => progressRef.current.value,
      });
      if (cancelled || skippingRef.current) {
        field.dispose();
        return;
      }
      fieldRef.current = field;

      const lineEl = textRef.current;
      const curEl = cursorRef.current;
      const hint = hintRef.current;

      lineEl.textContent = "";
      gsap.set(hint, { opacity: 0 });
      gsap.set(curEl, { opacity: 1 });

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
          exit(EXIT_FADE);
        },
      });
      timeline = tl;

      // Single p 0→1 — field reads this every RAF; typing locked to same timeline
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
        const labels = ["voidWeave", "denserWeave", "convergeSettle"] as const;

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
          tl.to({}, { duration: FINAL_LINGER }, at);
        }
      });
    })();

    return () => {
      cancelled = true;
      timeline?.kill();
      exitTween?.kill();
      cursorTween?.kill();
      overlay.removeEventListener("click", skip);
      window.removeEventListener("keydown", onKey);
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "clamp(1.25rem, 4vh, 2.5rem) clamp(1rem, 4vw, 2rem)",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "clamp(0.95rem, 1.6vw + 0.55rem + 0.4vh, 1.65rem)",
            lineHeight: 1.45,
            letterSpacing: "0.01em",
            fontWeight: 400,
            color: FG,
            maxWidth: "min(36rem, 90vw)",
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
            bottom: "clamp(1rem, 3.5vh, 2rem)",
            left: 0,
            right: 0,
            margin: 0,
            textAlign: "center",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "clamp(0.65rem, 0.9vw + 0.4rem, 0.8rem)",
            letterSpacing: "0.06em",
            color: FG,
            opacity: 0,
          }}
        >
          click to enter
        </p>
      </div>
    </div>
  );
}
