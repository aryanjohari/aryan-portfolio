"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { WorkshopCarouselHandle } from "@/components/motion/WorkshopCarousel";
import type { Project } from "@/lib/projects";
import {
  canUseEnhancedMotion,
  MOTION,
  prefersReducedMotion,
} from "@/lib/motion";

type ProjectGalleryProps = {
  projects: Project[];
};

const HOOK_MAX = 90;

function truncateHook(text: string, max = HOOK_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${base}…`;
}

function indexHook(project: Project): string {
  if (project.contentStatus !== "ok") {
    return "yaml not configured";
  }
  return truncateHook(project.summary);
}

function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}

/** Deterministic hue 0–359 from slug for void-friendly accents. */
function slugHue(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

function FallbackCard({ project }: { project: Project }) {
  const missing = project.contentStatus !== "ok";
  return (
    <li className="project-gallery-fallback-card">
      <div
        className="project-gallery-fallback-visual"
        style={
          {
            "--gallery-hue": String(slugHue(project.slug)),
          } as CSSProperties
        }
        aria-hidden="true"
      />
      <div className="project-gallery-fallback-body">
        <Link
          href={`/projects/${project.slug}`}
          className="project-gallery-fallback-title"
        >
          {project.title}
        </Link>
        <p
          className={
            missing
              ? "project-gallery-fallback-summary is-missing"
              : "project-gallery-fallback-summary"
          }
        >
          {indexHook(project)}
        </p>
        <p className="project-gallery-fallback-status">
          {project.status}
          {missing && (
            <span
              className="content-warn"
              title={project.contentMessage ?? "portfolio.yaml issue"}
              aria-label={`Content warning: ${project.contentMessage ?? "portfolio.yaml issue"}`}
            >
              ⚠
            </span>
          )}
        </p>
        <Link
          href={`/projects/${project.slug}`}
          className="project-gallery-fallback-open"
        >
          open project
        </Link>
      </div>
    </li>
  );
}

/**
 * Workshop edge-glow tablet carousel: Three.js stage + drag/snap, with DOM
 * a11y list and static-card fallback when WebGL / motion are unavailable.
 * Mount plays rim-ignite + depth-assemble; unmount extinguishes then disposes.
 */
export function ProjectGallery({ projects }: ProjectGalleryProps) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<WorkshopCarouselHandle | null>(null);
  const gsapRef = useRef<typeof import("gsap").gsap | null>(null);
  const snapTweenRef = useRef<{ kill: () => void } | null>(null);
  const floatRef = useRef(0);
  const activeRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startIndex: number;
    moved: boolean;
  } | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">("pending");
  const labelId = useId();
  const total = projects.length;
  const showChrome = total > 1;

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (total === 0) return;

    let cancelled = false;
    let exitHandle: WorkshopCarouselHandle | null = null;

    void (async () => {
      if (prefersReducedMotion()) {
        if (!cancelled) setMode("fallback");
        return;
      }

      const [{ canUseWorkshopWebGL, createWorkshopCarousel }, { gsap }] =
        await Promise.all([
          import("@/components/motion/WorkshopCarousel"),
          import("gsap"),
        ]);

      if (cancelled) return;

      if (!canUseWorkshopWebGL() || !hostRef.current) {
        setMode("fallback");
        return;
      }

      gsapRef.current = gsap;
      const enhanced = canUseEnhancedMotion();

      try {
        const handle = await createWorkshopCarousel(hostRef.current, {
          projects: projects.map((p) => ({
            slug: p.slug,
            title: p.title,
            hook: indexHook(p),
            status: p.status,
            missing: p.contentStatus !== "ok",
            hue: slugHue(p.slug),
          })),
          enhanced,
          maxDpr: enhanced
            ? MOTION.workshop.dprEnhanced
            : MOTION.workshop.dprDefault,
          tokens: MOTION.workshop,
          onContextLost: () => {
            if (cancelled) return;
            snapTweenRef.current?.kill();
            snapTweenRef.current = null;
            carouselRef.current?.dispose();
            carouselRef.current = null;
            exitHandle = null;
            setMode("fallback");
          },
        });

        if (cancelled) {
          handle.dispose();
          return;
        }

        carouselRef.current = handle;
        exitHandle = handle;
        handle.setIndex(0);
        floatRef.current = 0;
        setMode("webgl");
        await handle.playEnter();
      } catch {
        if (!cancelled) setMode("fallback");
      }
    })();

    return () => {
      cancelled = true;
      snapTweenRef.current?.kill();
      snapTweenRef.current = null;
      const handle = exitHandle ?? carouselRef.current;
      carouselRef.current = null;
      exitHandle = null;
      gsapRef.current = null;
      if (!handle) return;
      void handle.playExit().finally(() => {
        handle.dispose();
      });
    };
  }, [projects, total]);

  // Quiet intro + chrome settle once the WebGL stage exists (VoidChrome
  // already faded the page; this is a local secondary beat).
  useLayoutEffect(() => {
    if (mode !== "webgl") return;
    const gsap = gsapRef.current;
    if (!gsap) return;

    const intro = document.querySelector(".workshop-intro");
    const chrome = document.querySelector(".project-gallery-chrome");
    const tweens: Array<{ kill: () => void }> = [];

    if (intro instanceof HTMLElement) {
      gsap.set(intro, { opacity: 0, y: 6 });
      tweens.push(
        gsap.to(intro, {
          opacity: 1,
          y: 0,
          duration: MOTION.medium,
          ease: MOTION.ease,
          clearProps: "transform",
        }),
      );
    }
    if (chrome instanceof HTMLElement) {
      gsap.set(chrome, { opacity: 0 });
      tweens.push(
        gsap.to(chrome, {
          opacity: 1,
          duration: MOTION.medium,
          ease: MOTION.ease,
          delay: 0.06,
        }),
      );
    }

    return () => {
      for (const tw of tweens) tw.kill();
    };
  }, [mode]);

  function commitActive(nearest: number) {
    const clamped = Math.max(0, Math.min(total - 1, nearest));
    if (clamped !== activeRef.current) {
      activeRef.current = clamped;
      setActiveIndex(clamped);
    }
  }

  function setFloatIndex(t: number) {
    floatRef.current = t;
    carouselRef.current?.setIndex(t);
    commitActive(Math.round(t));
  }

  function goToIndex(index: number) {
    const clamped = Math.max(0, Math.min(total - 1, index));
    const gsap = gsapRef.current;
    snapTweenRef.current?.kill();

    if (!gsap || mode !== "webgl") {
      setFloatIndex(clamped);
      return;
    }

    const proxy = { t: floatRef.current };
    snapTweenRef.current = gsap.to(proxy, {
      t: clamped,
      duration: MOTION.workshop.snapDuration,
      ease: MOTION.ease,
      onUpdate: () => setFloatIndex(proxy.t),
      onComplete: () => {
        snapTweenRef.current = null;
        setFloatIndex(clamped);
      },
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!showChrome) return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const key = event.key;
    if (
      key === "ArrowRight" ||
      key === "ArrowDown" ||
      key === "j" ||
      key === "J"
    ) {
      event.preventDefault();
      goToIndex(activeIndex + 1);
    } else if (
      key === "ArrowLeft" ||
      key === "ArrowUp" ||
      key === "k" ||
      key === "K"
    ) {
      event.preventDefault();
      goToIndex(activeIndex - 1);
    } else if (key === "Home") {
      event.preventDefault();
      goToIndex(0);
    } else if (key === "End") {
      event.preventDefault();
      goToIndex(total - 1);
    } else if (key === "Enter" || key === " ") {
      const project = projects[activeIndex];
      if (!project) return;
      event.preventDefault();
      router.push(`/projects/${project.slug}`);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (mode !== "webgl" || total <= 1) return;
    if (event.button !== 0) return;
    snapTweenRef.current?.kill();
    snapTweenRef.current = null;
    carouselRef.current?.setDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startIndex: floatRef.current,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      // Hover tilt on enhanced mouse only
      if (
        mode === "webgl" &&
        !dragRef.current &&
        canUseEnhancedMotion() &&
        event.pointerType === "mouse"
      ) {
        const host = hostRef.current;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        const max = MOTION.workshop.hoverTiltMax;
        carouselRef.current?.setHoverTilt(nx * max, -ny * max);
      }
      return;
    }

    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > MOTION.workshop.dragThreshold) {
      drag.moved = true;
    }
    const next =
      drag.startIndex - dx / MOTION.workshop.dragSensitivity;
    const clamped = Math.max(-0.15, Math.min(total - 1 + 0.15, next));
    setFloatIndex(clamped);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    carouselRef.current?.setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }

    if (!drag.moved) {
      const slug = carouselRef.current?.pick(event.clientX, event.clientY);
      if (slug) router.push(`/projects/${slug}`);
      return;
    }

    const nearest = Math.round(floatRef.current);
    goToIndex(nearest);
  }

  function onPointerLeave() {
    if (dragRef.current) return;
    carouselRef.current?.setHoverTilt(0, 0);
  }

  if (total === 0) {
    return (
      <section className="project-gallery" aria-label="Project gallery">
        <p className="project-gallery-empty-state">No projects yet.</p>
      </section>
    );
  }

  const useFallback = mode === "fallback";
  const useWebgl = mode === "webgl";

  return (
    <section
      className={
        useWebgl
          ? "project-gallery project-gallery--webgl"
          : useFallback
            ? "project-gallery project-gallery--fallback"
            : "project-gallery"
      }
      aria-roledescription="carousel"
      aria-label="Project gallery"
      aria-labelledby={labelId}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {showChrome && !useFallback && (
        <div className="project-gallery-chrome">
          <p id={labelId} className="visually-hidden">
            Project gallery — drag to browse
          </p>
          <div className="project-gallery-nav" role="group" aria-label="Browse projects">
            <button
              type="button"
              className="project-gallery-arrow"
              aria-label="Previous project"
              disabled={activeIndex <= 0}
              onClick={() => goToIndex(activeIndex - 1)}
            >
              ←
            </button>
            <p className="project-gallery-index" aria-live="polite">
              <span className="visually-hidden">Project </span>
              <span className="project-gallery-index-current">
                {padIndex(activeIndex + 1)}
              </span>
              <span className="project-gallery-index-sep" aria-hidden="true">
                {" / "}
              </span>
              <span className="visually-hidden">of </span>
              <span className="project-gallery-index-total">
                {padIndex(total)}
              </span>
            </p>
            <button
              type="button"
              className="project-gallery-arrow"
              aria-label="Next project"
              disabled={activeIndex >= total - 1}
              onClick={() => goToIndex(activeIndex + 1)}
            >
              →
            </button>
          </div>
        </div>
      )}

      {useFallback && (
        <p id={labelId} className="visually-hidden">
          Project gallery
        </p>
      )}

      {!showChrome && !useFallback && (
        <p id={labelId} className="visually-hidden">
          Project gallery
        </p>
      )}

      {/* WebGL host — hidden in fallback; always mounted until mode resolves so ref exists */}
      {!useFallback && (
        <div
          ref={hostRef}
          className="project-gallery-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={onPointerLeave}
        />
      )}

      {useFallback && (
        <ul className="project-gallery-fallback-list">
          {projects.map((project) => (
            <FallbackCard key={project.slug} project={project} />
          ))}
        </ul>
      )}

      {/* Always in the a11y tree when WebGL is showing */}
      {useWebgl && (
        <ul className="project-gallery-a11y-list visually-hidden">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/projects/${project.slug}`}>
                {project.title}
                <span> — {indexHook(project)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
