"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { AdaptiveBackground } from "@/components/background/AdaptiveBackground";
import { usePrefersWideViewport } from "@/hooks/usePrefersWideViewport";

gsap.registerPlugin(ScrollTrigger);

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export default function Home() {
  const isWide = usePrefersWideViewport();
  const introRef = useRef<HTMLElement | null>(null);
  const revealLockedRef = useRef(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [loadingValue, setLoadingValue] = useState(0);
  const [revealProgress, setRevealProgress] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);

  const handleHydratedChange = useCallback(
    (ready: boolean) => {
      if (!isWide) return;
      setBackgroundReady(ready);
      if (!ready && !revealLockedRef.current) {
        setRevealProgress(0);
      }
    },
    [isWide],
  );

  useEffect(() => {
    if (!isWide || !backgroundReady) return;

    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: 100,
      duration: 3.8,
      ease: "power1.inOut",
      onUpdate: () => {
        setLoadingValue(Math.round(counter.value));
      },
    });

    return () => {
      tween.kill();
    };
  }, [backgroundReady, isWide]);

  useEffect(() => {
    if (!isWide || !backgroundReady || !introRef.current || revealLockedRef.current) {
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: introRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: (self) => {
        const next = clamp01(self.progress);
        setRevealProgress(next);

        if (next >= 0.999 && !revealLockedRef.current) {
          revealLockedRef.current = true;
          setRevealProgress(1);
          setIntroComplete(true);
          self.kill(false);
        }
      },
    });

    ScrollTrigger.refresh();

    return () => {
      trigger.kill();
    };
  }, [backgroundReady, isWide]);

  const loaderOpacity = useMemo(() => {
    if (!isWide || introComplete) return 0;
    return 1 - smoothstep(0.12, 0.7, revealProgress);
  }, [introComplete, isWide, revealProgress]);

  const heroOpacity = useMemo(() => {
    if (!isWide) return 1;
    if (introComplete) return 1;
    return smoothstep(0.55, 0.9, revealProgress);
  }, [introComplete, isWide, revealProgress]);

  const heroShift = useMemo(() => {
    if (!isWide || introComplete) return 0;
    return (1 - heroOpacity) * 40;
  }, [heroOpacity, introComplete, isWide]);

  const scrollPromptOpacity = backgroundReady ? smoothstep(92, 100, loadingValue) : 0;
  const introEnabled = isWide && !introComplete;
  const controlledRevealProgress = introEnabled ? revealProgress : 1;
  const shaderOpacity = useMemo(() => {
    if (!isWide) return 1;
    if (!backgroundReady) return 0;
    if (introComplete) return 1;
    return clamp01(loadingValue / 100);
  }, [backgroundReady, introComplete, isWide, loadingValue]);
  const shaderBlurPx = useMemo(() => {
    if (!isWide || !backgroundReady || introComplete) return 0;
    return (1 - smoothstep(18, 100, loadingValue)) * 10;
  }, [backgroundReady, introComplete, isWide, loadingValue]);

  const heroOverlay = (
    <main className="pointer-events-none relative z-10 h-full min-h-dvh">
      <div className="flex h-full min-h-dvh justify-start p-4 sm:p-6 md:p-8">
        <div
          className="pointer-events-none transition-opacity duration-300"
          style={{
            opacity: heroOpacity,
            transform: `translate3d(0, ${heroShift}px, 0)`,
          }}
        >
          <h1 className="floating-title select-none text-left">
            <span className="floating-title-line">Aryan</span>
            <span className="floating-title-line">Johari</span>
          </h1>
        </div>
      </div>
      <nav
        className="game-nav transition-opacity duration-300"
        aria-label="Main navigation"
        style={{
          opacity: heroOpacity,
          pointerEvents: heroOpacity > 0.72 ? "auto" : "none",
        }}
      >
        <a href="#about" className="game-nav-link">
          about
        </a>
        <a href="#projects" className="game-nav-link">
          projects
        </a>
        <a href="#blog" className="game-nav-link">
          blog
        </a>
        <a href="#contact" className="game-nav-link">
          contact
        </a>
      </nav>
    </main>
  );

  if (!isWide) {
    return (
      <div className="relative min-h-dvh bg-black">
        <div className="fixed inset-0 z-0">
          <AdaptiveBackground revealProgress={1} introEnabled={false} />
        </div>
        {heroOverlay}
      </div>
    );
  }

  return (
    <div className="relative bg-black">
      <div
        className="fixed inset-0 z-0"
        style={{
          opacity: shaderOpacity,
          filter: shaderBlurPx > 0 ? `blur(${shaderBlurPx}px)` : "none",
        }}
      >
        <AdaptiveBackground
          revealProgress={controlledRevealProgress}
          introEnabled={introEnabled}
          onHydratedChange={handleHydratedChange}
        />
      </div>
      <section ref={introRef} className="relative min-h-[220dvh]">
        <div className="sticky top-0 h-dvh overflow-hidden">
          <div
            className="intro-loader-shell pointer-events-none absolute inset-0 z-20"
            aria-hidden={loaderOpacity <= 0.02}
            style={{ opacity: loaderOpacity }}
          >
            <div className="intro-loader-center">
              <div className="intro-loader-percent">
                {loadingValue.toString().padStart(3, "0")}
              </div>
              <div
                className="intro-loader-scroll"
                style={{ opacity: scrollPromptOpacity }}
              >
                scroll
              </div>
            </div>
          </div>
          {heroOverlay}
        </div>
      </section>
    </div>
  );
}
