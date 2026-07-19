"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  BOOT_DONE_EVENT,
  isBootDone,
  prefersReducedMotion,
} from "@/lib/motion";

const softLinks = [
  {
    href: "/workshop",
    label: "workshop",
    title: "Full project catalog",
    glyph: "workshop" as const,
  },
  {
    href: "/about",
    label: "about",
    title: "Bio and background",
    glyph: "about" as const,
  },
  {
    href: "/resume.pdf",
    label: "resume",
    title: "Download PDF resume",
    glyph: "resume" as const,
  },
];

const GLYPH_SIZE = 14;
/** Let name/ask settle briefly after boot before the rail fades in. */
const REVEAL_DELAY_MS = 900;

function SoftGlyph({ kind }: { kind: "workshop" | "about" | "resume" }) {
  if (kind === "workshop") {
    return (
      <svg
        className="glyph-link-icon"
        viewBox="0 0 16 16"
        width={GLYPH_SIZE}
        height={GLYPH_SIZE}
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="1.5"
          y="1.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="9.5"
          y="1.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="1.5"
          y="9.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect
          x="9.5"
          y="9.5"
          width="5"
          height="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (kind === "about") {
    return (
      <svg
        className="glyph-link-icon"
        viewBox="0 0 16 16"
        width={GLYPH_SIZE}
        height={GLYPH_SIZE}
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx="8"
          cy="5"
          r="2.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M3.5 13.5c0-2.6 2-4.25 4.5-4.25s4.5 1.65 4.5 4.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className="glyph-link-icon"
      viewBox="0 0 16 16"
      width={GLYPH_SIZE}
      height={GLYPH_SIZE}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3.5"
        y="1.5"
        width="9"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M5.5 5h5M5.5 8h5M5.5 11h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Soft section links: desktop right-rail (editorial margin), mobile row under
 * ask. Auto-reveals after boot (short settle delay; immediate if reduced-motion)
 * — no ask-focus gate. Inert only until revealed.
 */
export function HomeGlyphRow() {
  const rowRef = useRef<HTMLElement>(null);
  const [bootDone, setBootDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (isBootDone()) {
      setBootDone(true);
      return;
    }
    const onDone = () => setBootDone(true);
    window.addEventListener(BOOT_DONE_EVENT, onDone);
    return () => window.removeEventListener(BOOT_DONE_EVENT, onDone);
  }, []);

  useEffect(() => {
    if (!bootDone) return;

    if (prefersReducedMotion()) {
      setRevealed(true);
      return;
    }

    const id = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [bootDone]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el || !revealed || animatedRef.current) return;

    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.visibility = "visible";
      el.removeAttribute("inert");
      animatedRef.current = true;
      return;
    }

    animatedRef.current = true;
    let cancelled = false;
    let tween: { kill: () => void } | undefined;

    const isRail =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;

    void import("gsap").then(({ gsap }) => {
      if (cancelled || !rowRef.current) return;
      el.removeAttribute("inert");
      gsap.set(el, { visibility: "visible" });
      tween = gsap.fromTo(
        el,
        isRail ? { opacity: 0, x: 10 } : { opacity: 0, y: 8 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
        },
      );
    });

    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [revealed]);

  return (
    <nav
      ref={rowRef}
      className={`home-glyph-row${revealed ? " is-revealed" : ""}`}
      aria-label="Site sections"
      {...(!revealed ? { inert: true } : {})}
    >
      {softLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          title={link.title}
          className="glyph-link"
        >
          <SoftGlyph kind={link.glyph} />
          <span className="glyph-link-label">{link.label}</span>
        </Link>
      ))}
    </nav>
  );
}
