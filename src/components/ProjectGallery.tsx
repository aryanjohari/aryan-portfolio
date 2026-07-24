"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import type { Project } from "@/lib/projects";
import {
  canUseEnhancedMotion,
  MOTION,
  prefersReducedMotion,
} from "@/lib/motion";

type ProjectGalleryProps = {
  projects: Project[];
};

type DragInstance = {
  kill: () => void;
  update: (soft?: boolean) => void;
  applyBounds: (bounds: { minX: number; maxX: number }) => void;
  x: number;
  endX: number;
};

function indexSummary(project: Project): string {
  if (project.contentStatus !== "ok") {
    return "yaml not configured";
  }
  return project.summary;
}

function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}

/** Deterministic hue 0–359 from slug for void-friendly gradient accents. */
function slugHue(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

function StackTags({ stack }: { stack: string[] }) {
  if (stack.length === 0) {
    return <span className="project-gallery-empty">—</span>;
  }

  return (
    <span className="stack-tags">
      {stack.map((item) => (
        <span key={item} className="stack-tag">
          {item}
        </span>
      ))}
    </span>
  );
}

function CardBody({
  project,
  interactive,
}: {
  project: Project;
  interactive: boolean;
}) {
  const missing = project.contentStatus !== "ok";
  const tabIndex = interactive ? undefined : -1;

  return (
    <div className="project-gallery-card-inner">
      <div
        className="project-gallery-visual"
        style={
          {
            "--gallery-hue": String(slugHue(project.slug)),
          } as CSSProperties
        }
        aria-hidden="true"
      />

      <div className="project-gallery-card-head">
        <Link
          href={`/projects/${project.slug}`}
          className="project-gallery-title"
          tabIndex={tabIndex}
        >
          {project.title}
        </Link>
        <span className="project-gallery-slug">{project.slug}</span>
      </div>

      <p
        className={
          missing
            ? "project-gallery-summary project-gallery-summary--missing"
            : "project-gallery-summary"
        }
      >
        {indexSummary(project)}
      </p>

      <div className="project-gallery-meta">
        <StackTags stack={project.stack} />
        <span className="project-gallery-sep" aria-hidden="true">
          ·
        </span>
        <span className="project-gallery-status">
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
        </span>
      </div>

      <div className="project-gallery-actions">
        <Link
          href={`/projects/${project.slug}`}
          className="project-gallery-open"
          tabIndex={tabIndex}
        >
          open project
        </Link>
        {project.demo ? (
          <Link
            href={`/projects/${project.slug}`}
            className="project-gallery-demo"
            tabIndex={tabIndex}
          >
            try demo
          </Link>
        ) : (
          <span className="demo-empty" aria-label="No demo available">
            —
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Self-contained coverflow gallery: center active card, drag / arrows / dots.
 * No page-scroll pin scrub — document scroll stays normal.
 */
export function ProjectGallery({ projects }: ProjectGalleryProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const activeRef = useRef(0);
  const goToRef = useRef<(index: number, opts?: { animate?: boolean }) => void>(
    () => {},
  );
  const proxyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragInstance | null>(null);
  const spacingRef = useRef(280);
  const tweenRef = useRef<{ kill: () => void } | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const labelId = useId();
  const total = projects.length;
  const showChrome = total > 1;

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  // —— Coverflow + Draggable (all breakpoints; gates 3D / inertia) ——
  useEffect(() => {
    if (total === 0) return;

    const stage = stageRef.current;
    const deck = deckRef.current;
    if (!stage || !deck) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let draggable: DragInstance | null = null;

    void (async () => {
      const [{ gsap }, { Draggable }] = await Promise.all([
        import("gsap"),
        import("gsap/Draggable"),
      ]);
      if (cancelled) return;

      let inertiaOk = false;
      try {
        const { InertiaPlugin } = await import("gsap/InertiaPlugin");
        gsap.registerPlugin(Draggable, InertiaPlugin);
        inertiaOk = true;
      } catch {
        gsap.registerPlugin(Draggable);
      }

      const use3D = canUseEnhancedMotion();
      const useInertia = inertiaOk && !prefersReducedMotion() && total > 1;
      const reduced = prefersReducedMotion();

      const cards = cardRefs.current.filter(Boolean) as HTMLLIElement[];
      if (cards.length === 0) return;

      const proxy = document.createElement("div");
      proxyRef.current = proxy;
      gsap.set(proxy, { x: 0 });

      const measureSpacing = () => {
        const card = cards[0];
        const width = card?.offsetWidth || Math.min(480, stage.clientWidth * 0.72);
        spacingRef.current = Math.max(160, width * 0.48);
        return spacingRef.current;
      };

      const applyProgress = (floatIndex: number) => {
        const spacing = spacingRef.current;
        cards.forEach((card, i) => {
          const d = i - floatIndex;
          const abs = Math.min(Math.abs(d), 2);
          const nearest = Math.round(floatIndex);
          const isNear = i === nearest;

          if (reduced) {
            gsap.set(card, {
              xPercent: -50,
              yPercent: -50,
              x: 0,
              y: 0,
              scale: 1,
              rotateY: 0,
              opacity: i === nearest ? 1 : 0,
              zIndex: i === nearest ? total : 0,
              pointerEvents: i === nearest ? "auto" : "none",
            });
            card.classList.toggle("is-active", i === nearest);
            return;
          }

          const props: Record<string, number | string> = {
            xPercent: -50,
            yPercent: -50,
            x: d * spacing,
            scale: 1 - abs * 0.08,
            opacity: Math.max(0.3, 1 - abs * 0.35),
            zIndex: total - Math.round(Math.abs(d)),
            pointerEvents: isNear ? "auto" : "none",
          };
          if (use3D) {
            props.rotateY = gsap.utils.clamp(-24, 24, d * -12);
            props.transformPerspective = 900;
          } else {
            props.rotateY = 0;
          }
          gsap.set(card, props);
          card.classList.toggle("is-active", isNear);
        });
      };

      const commitIndex = (index: number) => {
        const clamped = Math.max(0, Math.min(total - 1, index));
        activeRef.current = clamped;
        setActiveIndex(clamped);
        applyProgress(clamped);
      };

      const goTo = (index: number, opts?: { animate?: boolean }) => {
        const clamped = Math.max(0, Math.min(total - 1, index));
        const spacing = spacingRef.current;
        const targetX = -clamped * spacing;
        const animate = opts?.animate !== false && !reduced;

        tweenRef.current?.kill();
        tweenRef.current = null;

        activeRef.current = clamped;
        setActiveIndex(clamped);

        if (!animate) {
          gsap.set(proxy, { x: targetX });
          draggable?.update(true);
          applyProgress(clamped);
          return;
        }

        const tween = gsap.to(proxy, {
          x: targetX,
          duration: MOTION.medium,
          ease: MOTION.ease,
          onUpdate: () => {
            const x = Number(gsap.getProperty(proxy, "x"));
            applyProgress(-x / spacing);
          },
          onComplete: () => {
            applyProgress(clamped);
            draggable?.update(true);
          },
        });
        tweenRef.current = tween;
      };
      goToRef.current = goTo;

      const getBounds = () => ({
        minX: -(total - 1) * spacingRef.current,
        maxX: 0,
      });

      measureSpacing();
      gsap.set(proxy, { x: -activeRef.current * spacingRef.current });
      applyProgress(activeRef.current);

      if (total > 1) {
        const instances = Draggable.create(proxy, {
          trigger: stage,
          type: "x",
          inertia: useInertia,
          dragClickables: false,
          minimumMovement: 8,
          bounds: getBounds(),
          snap: useInertia
            ? {
                x: (value: number) =>
                  gsap.utils.snap(spacingRef.current, value),
              }
            : undefined,
          onPress() {
            tweenRef.current?.kill();
            tweenRef.current = null;
            stage.classList.add("is-dragging");
          },
          onDrag(this: DragInstance) {
            const spacing = spacingRef.current || 1;
            applyProgress(-this.x / spacing);
          },
          onThrowUpdate(this: DragInstance) {
            const spacing = spacingRef.current || 1;
            applyProgress(-this.x / spacing);
          },
          onDragEnd(this: DragInstance) {
            stage.classList.remove("is-dragging");
            if (useInertia) return;
            const spacing = spacingRef.current || 1;
            const raw = -this.x / spacing;
            const current = activeRef.current;
            const delta = raw - current;
            let next = Math.round(raw);
            if (Math.abs(delta) < 0.2) {
              next = current;
            }
            next = Math.max(0, Math.min(total - 1, next));
            goTo(next, { animate: !reduced });
          },
          onThrowComplete(this: DragInstance) {
            stage.classList.remove("is-dragging");
            const spacing = spacingRef.current || 1;
            const next = Math.max(
              0,
              Math.min(total - 1, Math.round(-this.x / spacing)),
            );
            commitIndex(next);
            gsap.set(proxy, { x: -next * spacing });
            this.update(true);
          },
        }) as DragInstance[];

        draggable = instances[0] ?? null;
        dragRef.current = draggable;
      }

      resizeObserver = new ResizeObserver(() => {
        const spacing = measureSpacing();
        gsap.set(proxy, { x: -activeRef.current * spacing });
        draggable?.applyBounds(getBounds());
        draggable?.update(true);
        applyProgress(activeRef.current);
      });
      resizeObserver.observe(stage);
      cards.forEach((c) => resizeObserver?.observe(c));

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      tweenRef.current?.kill();
      tweenRef.current = null;
      resizeObserver?.disconnect();
      dragRef.current?.kill();
      dragRef.current = null;
      proxyRef.current = null;
      setReady(false);
    };
  }, [projects, total]);

  function goToIndex(index: number) {
    goToRef.current(index, { animate: true });
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

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goToIndex(activeIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goToIndex(activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goToIndex(total - 1);
    }
  }

  return (
    <section
      ref={sectionRef}
      className={
        ready
          ? "project-gallery project-gallery--ready"
          : "project-gallery"
      }
      aria-roledescription="carousel"
      aria-label="Project gallery"
      aria-labelledby={labelId}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {showChrome && (
        <div className="project-gallery-chrome">
          <button
            type="button"
            className="project-gallery-arrow project-gallery-arrow--prev"
            aria-label="Previous project"
            disabled={activeIndex <= 0}
            onClick={() => goToIndex(activeIndex - 1)}
          >
            ←
          </button>

          <div className="project-gallery-chrome-center">
            <p id={labelId} className="project-gallery-affordance">
              drag or use arrows
            </p>
            <p className="project-gallery-index" aria-live="polite">
              <span className="visually-hidden">Project </span>
              {padIndex(activeIndex + 1)}
              <span aria-hidden="true"> / </span>
              <span className="visually-hidden">of </span>
              {padIndex(total)}
            </p>
            <div className="project-gallery-dots" role="group" aria-label="Projects">
              {projects.map((project, i) => (
                <button
                  key={project.slug}
                  type="button"
                  aria-label={`${project.title} (${padIndex(i + 1)} of ${padIndex(total)})`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className={
                    i === activeIndex
                      ? "project-gallery-dot is-active"
                      : "project-gallery-dot"
                  }
                  onClick={() => goToIndex(i)}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="project-gallery-arrow project-gallery-arrow--next"
            aria-label="Next project"
            disabled={activeIndex >= total - 1}
            onClick={() => goToIndex(activeIndex + 1)}
          >
            →
          </button>
        </div>
      )}

      {!showChrome && (
        <p id={labelId} className="visually-hidden">
          Project gallery
        </p>
      )}

      <div ref={stageRef} className="project-gallery-stage">
        <ul ref={deckRef} className="project-gallery-deck">
          {projects.map((project, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                key={project.slug}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={
                  isActive
                    ? "project-gallery-card is-active"
                    : "project-gallery-card"
                }
                data-gallery-card
                aria-hidden={isActive ? undefined : true}
                aria-roledescription="slide"
                aria-label={`${padIndex(i + 1)} of ${padIndex(total)}: ${project.title}`}
              >
                <CardBody project={project} interactive={isActive} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
