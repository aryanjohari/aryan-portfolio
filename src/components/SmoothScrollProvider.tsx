"use client";

import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

type SmoothScrollProviderProps = {
  children: React.ReactNode;
};

function LenisGsapBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    gsap.ticker.lagSmoothing(0);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };

    const onScroll = () => {
      ScrollTrigger.update();
    };

    gsap.ticker.add(onTick);
    lenis.on("scroll", onScroll);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

  return null;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        duration: 1.05,
        syncTouch: true,
        touchMultiplier: 1.1,
      }}
    >
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  );
}
