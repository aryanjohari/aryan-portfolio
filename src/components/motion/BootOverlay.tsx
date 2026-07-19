"use client";

import { useEffect, useRef, useState } from "react";

import { canUseEnhancedMotion } from "@/lib/motion";

const AUTO_HIDE_MS = 1500;

/**
 * Brief full-screen boot fade (GSAP). Placeholder — proves GSAP loads.
 * Underlying content stays in the DOM; overlay unmounts after fade so it
 * cannot block guide input.
 */
export function BootOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setActive(canUseEnhancedMotion());

    const mqDesktop = window.matchMedia("(min-width: 1024px)");
    const mqPointer = window.matchMedia("(pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      if (!canUseEnhancedMotion()) {
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

  useEffect(() => {
    if (!active || done) return;
    const el = overlayRef.current;
    if (!el) return;

    let cancelled = false;
    let tween: { kill: () => void } | undefined;
    let timer = 0;

    const hide = () => {
      if (cancelled || !overlayRef.current) return;
      window.clearTimeout(timer);
      void import("gsap").then(({ gsap }) => {
        if (cancelled || !overlayRef.current) return;
        tween?.kill();
        tween = gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.45,
          ease: "power2.out",
          onComplete: () => {
            if (!cancelled) setDone(true);
          },
        });
      });
    };

    void import("gsap").then(() => {
      if (cancelled) return;
      timer = window.setTimeout(hide, AUTO_HIDE_MS);
    });

    el.addEventListener("click", hide);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      tween?.kill();
      el.removeEventListener("click", hide);
    };
  }, [active, done]);

  if (!active || done) return null;

  return (
    <div
      ref={overlayRef}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "var(--color-bg)",
        opacity: 1,
        cursor: "pointer",
      }}
    />
  );
}
