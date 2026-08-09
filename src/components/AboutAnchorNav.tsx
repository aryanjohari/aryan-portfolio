"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { prefersReducedMotion } from "@/lib/motion";

const SECTIONS = [
  { id: "philosophy", label: "philosophy", num: "01" },
  { id: "background", label: "background", num: "02" },
  { id: "education", label: "education", num: "03" },
  { id: "availability", label: "availability", num: "04" },
] as const;

function getAboutScrollport(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "[data-void-scroll].about-page, .about-page",
  );
}

function scrollAboutToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

/**
 * Sticky section anchor menu + scroll-spy.
 * Active link follows the about content scrollport; entrance stagger skipped under reduced-motion.
 * Per-block text fades live in VoidScrollDrama / AboutScrollDrama (not here).
 */
export function AboutAnchorNav() {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined") return SECTIONS[0].id;
    const hash = window.location.hash.replace(/^#/, "");
    return SECTIONS.some((s) => s.id === hash) ? hash : SECTIONS[0].id;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !SECTIONS.some((s) => s.id === hash)) return;
    const id = window.requestAnimationFrame(() => scrollAboutToId(hash));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const scrollport = getAboutScrollport();

    const sectionEls = SECTIONS.map((s) =>
      document.getElementById(s.id),
    ).filter((el): el is HTMLElement => el != null);

    if (sectionEls.length === 0) return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        root: scrollport,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    sectionEls.forEach((el) => sectionObserver.observe(el));

    return () => {
      sectionObserver.disconnect();
    };
  }, []);

  const onJump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    setActiveId(id);
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", url);
    scrollAboutToId(id);
  };

  return (
    <nav
      ref={navRef}
      className={`about-anchor${ready ? " is-ready" : ""}`}
      aria-label="On this page"
    >
      <p className="about-anchor-label" aria-hidden="true">
        sections
      </p>
      <ol className="about-anchor-list">
        {SECTIONS.map((section, i) => {
          const isActive = activeId === section.id;
          return (
            <li
              key={section.id}
              className="about-anchor-item"
              style={{ ["--i" as string]: i }}
            >
              <a
                href={`#${section.id}`}
                className={
                  isActive
                    ? "about-anchor-link is-active"
                    : "about-anchor-link"
                }
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => onJump(event, section.id)}
              >
                <span className="about-anchor-num">{section.num}</span>
                <span className="about-anchor-text">{section.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <div className="about-anchor-rail" aria-hidden="true">
        <span
          className="about-anchor-thumb"
          style={{
            ["--active" as string]: SECTIONS.findIndex(
              (s) => s.id === activeId,
            ),
          }}
        />
      </div>
    </nav>
  );
}
