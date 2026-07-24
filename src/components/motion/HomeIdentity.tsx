"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  BOOT_DONE_EVENT,
  isBootDone,
  MOTION,
  prefersReducedMotion,
} from "@/lib/motion";

const FINAL_NAME = "aryan johari";
/** Placeholder glyphs matching name length — never flash FINAL_NAME before scramble. */
const PLACEHOLDER_NAME = FINAL_NAME.replace(/[^\s]/g, "·");
const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz····";

/**
 * Home header identity: soft GSAP scramble → final name after boot on every
 * load (immediate when reduced-motion). Initial paint is placeholders only —
 * no FINAL_NAME flash. No under-name role/tagline.
 */
export function HomeIdentity() {
  const nameRef = useRef<HTMLSpanElement>(null);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    if (isBootDone()) {
      setBootDone(true);
      return;
    }
    const onDone = () => setBootDone(true);
    window.addEventListener(BOOT_DONE_EVENT, onDone);
    return () => window.removeEventListener(BOOT_DONE_EVENT, onDone);
  }, []);

  useLayoutEffect(() => {
    if (!bootDone) return;
    const nameEl = nameRef.current;
    if (!nameEl) return;

    if (prefersReducedMotion()) {
      nameEl.textContent = FINAL_NAME;
      return;
    }

    let cancelled = false;
    let tween: { kill: () => void } | undefined;

    nameEl.textContent = PLACEHOLDER_NAME;

    void import("gsap").then(({ gsap }) => {
      if (cancelled || !nameRef.current) return;

      const proxy = { t: 0 };
      tween = gsap.to(proxy, {
        t: 1,
        duration: MOTION.scramble.duration,
        ease: MOTION.scramble.ease,
        onUpdate: () => {
          const progress = proxy.t;
          let out = "";
          for (let i = 0; i < FINAL_NAME.length; i++) {
            const ch = FINAL_NAME[i];
            if (ch === " ") {
              out += " ";
              continue;
            }
            const settleAt = 0.28 + (i / FINAL_NAME.length) * 0.62;
            if (progress >= settleAt) {
              out += ch;
            } else {
              const noise =
                SCRAMBLE_CHARS[
                  Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                ] ?? "·";
              out += noise;
            }
          }
          nameEl.textContent = out;
        },
        onComplete: () => {
          nameEl.textContent = FINAL_NAME;
        },
      });
    });

    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [bootDone]);

  return (
    <p className="site-header-identity">
      <Link href="/" className="site-name" aria-label={FINAL_NAME}>
        <span ref={nameRef} aria-hidden="true">
          {PLACEHOLDER_NAME}
        </span>
      </Link>
    </p>
  );
}
