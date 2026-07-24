"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";

const SECTIONS = [
  { id: "philosophy", label: "philosophy", num: "01" },
  { id: "background", label: "background", num: "02" },
  { id: "education", label: "education", num: "03" },
  { id: "availability", label: "availability", num: "04" },
] as const;

/**
 * Sticky section anchor menu + soft heading fades.
 * Active link follows scroll; entrance stagger skipped under reduced-motion.
 */
export function AboutAnchorNav() {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const reduced = prefersReducedMotion();

    const headings = document.querySelectorAll<HTMLElement>(
      ".about-section h2",
    );
    if (!reduced && headings.length > 0) {
      headings.forEach((el) => el.classList.add("about-heading--fade"));
    }

    const sectionEls = SECTIONS.map((s) =>
      document.getElementById(s.id),
    ).filter((el): el is HTMLElement => el != null);

    if (sectionEls.length === 0) return;

    const headingObserver = reduced
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.classList.add("is-visible");
              headingObserver?.unobserve(entry.target);
            }
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.2 },
        );

    headings.forEach((el) => headingObserver?.observe(el));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    sectionEls.forEach((el) => sectionObserver.observe(el));

    return () => {
      headingObserver?.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  const onJump = (id: string) => {
    setActiveId(id);
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
                onClick={() => onJump(section.id)}
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
