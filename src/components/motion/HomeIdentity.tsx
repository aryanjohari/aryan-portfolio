"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  BOOT_DONE_EVENT,
  isBootDone,
  prefersReducedMotion,
} from "@/lib/motion";

const FINAL_NAME = "aryan johari";
/** Placeholder glyphs matching name length — never flash FINAL_NAME before scramble. */
const PLACEHOLDER_NAME = FINAL_NAME.replace(/[^\s]/g, "·");
const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz····";
/** Soft settle for hero-scale name. */
const SCRAMBLE_DURATION = 2.15;
const ROLE_FADE_DURATION = 0.55;

/**
 * Home header identity: soft GSAP scramble → final name after boot on every
 * load (immediate when reduced-motion). Role fades in under the name after
 * scramble completes. Initial paint is placeholders only — no FINAL_NAME flash.
 */
export function HomeIdentity() {
  const nameRef = useRef<HTMLSpanElement>(null);
  const roleRef = useRef<HTMLSpanElement>(null);
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
    const roleEl = roleRef.current;
    if (!nameEl || !roleEl) return;

    if (prefersReducedMotion()) {
      nameEl.textContent = FINAL_NAME;
      roleEl.style.opacity = "1";
      return;
    }

    let cancelled = false;
    let tween: { kill: () => void } | undefined;
    let roleTween: { kill: () => void } | undefined;

    roleEl.style.opacity = "0";
    nameEl.textContent = PLACEHOLDER_NAME;

    void import("gsap").then(({ gsap }) => {
      if (cancelled || !nameRef.current || !roleRef.current) return;

      const proxy = { t: 0 };
      tween = gsap.to(proxy, {
        t: 1,
        duration: SCRAMBLE_DURATION,
        ease: "power2.out",
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
          roleTween = gsap.to(roleEl, {
            opacity: 1,
            duration: ROLE_FADE_DURATION,
            ease: "power1.out",
          });
        },
      });
    });

    return () => {
      cancelled = true;
      tween?.kill();
      roleTween?.kill();
    };
  }, [bootDone]);

  return (
    <p className="site-header-identity">
      <Link href="/" className="site-name" aria-label={FINAL_NAME}>
        <span ref={nameRef} aria-hidden="true">
          {PLACEHOLDER_NAME}
        </span>
      </Link>
      <span ref={roleRef} className="site-header-role" style={{ opacity: 0 }}>
        graduate engineer · auckland · sept 2026
      </span>
    </p>
  );
}
