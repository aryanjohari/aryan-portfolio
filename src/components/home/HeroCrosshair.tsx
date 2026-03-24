"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type HeroCrosshairProps = {
  accentColor: string;
};

function viewportCenter() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

export function HeroCrosshair({ accentColor }: HeroCrosshairProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    // Hydration matches {0,0}; center once on the client before paint (no pointer yet).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync to viewport
    setPos(viewportCenter());
  }, []);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const onResize = () => {
      setPos((p) => ({
        x: Math.min(Math.max(p.x, 0), window.innerWidth),
        y: Math.min(Math.max(p.y, 0), window.innerHeight),
      }));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-20 size-0"
      style={{
        left: pos.x,
        top: pos.y,
      }}
      aria-hidden
    >
      <div
        className="size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 20px ${accentColor}66`,
        }}
      />
    </div>
  );
}
