"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

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

/** Once per full load — returning to home settles without re-scramble. */
let didScrambleThisLoad = false;

type HomeIdentityProps = {
  /** When false (site chrome), show settled name immediately. */
  scramble?: boolean;
  /** Intercept home navigation (morph-first via VoidChrome). */
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Void chrome identity: soft GSAP scramble → final name after boot on home
 * (once per load). Site mode and return-to-home use the settled name.
 */
export function HomeIdentity({
  scramble = true,
  onNavigate,
}: HomeIdentityProps) {
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
    const nameEl = nameRef.current;
    if (!nameEl) return;

    if (!scramble || didScrambleThisLoad || prefersReducedMotion()) {
      nameEl.textContent = FINAL_NAME;
      if (scramble && prefersReducedMotion()) didScrambleThisLoad = true;
      return;
    }

    if (!bootDone) return;

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
          didScrambleThisLoad = true;
        },
      });
    });

    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [bootDone, scramble]);

  const initialText =
    !scramble || didScrambleThisLoad ? FINAL_NAME : PLACEHOLDER_NAME;

  return (
    <p className="site-header-identity">
      <Link
        href="/"
        className="site-name"
        aria-label={FINAL_NAME}
        onClick={onNavigate}
      >
        <span ref={nameRef} aria-hidden="true">
          {initialText}
        </span>
      </Link>
    </p>
  );
}
