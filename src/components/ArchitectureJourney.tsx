"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ArchitectureGraphView } from "@/components/ArchitectureGraphView";
import type { ArchitectureGraph } from "@/lib/architecture-graph";
import {
  JOURNEY,
  planArchitectureJourney,
  stopIndexForProgress,
  type CameraPose,
  type JourneyHop,
  type JourneyPlan,
  type JourneyStop,
} from "@/lib/architecture-journey";
import { resolveTourStepsFromGraph } from "@/lib/architecture-walkthrough";
import { MOTION, prefersReducedMotion } from "@/lib/motion";

type ArchitectureJourneyProps = {
  title: string;
  graph: ArchitectureGraph;
  sourceNote: string;
};

type MatchMediaHandle = {
  add: (query: string, handler: () => void) => unknown;
  revert: () => void;
};

type GsapLike = typeof import("gsap").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimelineLike = { to: (...args: any[]) => any; fromTo: (...args: any[]) => any };

function applyPose(gsap: GsapLike, camera: HTMLElement, pose: CameraPose) {
  gsap.set(camera, {
    x: pose.x,
    y: pose.y,
    scale: pose.scale,
    transformOrigin: "0 0",
  });
}

function prepareEdgeDraw(root: HTMLElement) {
  const paths = root.querySelectorAll<SVGPathElement>(".arch-graph-edge-path");
  paths.forEach((path) => {
    const edge = path.closest(".arch-graph-edge");
    if (edge?.classList.contains("is-dashed")) {
      path.dataset.dashed = "1";
      return;
    }
    try {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.dataset.pathLength = String(len);
      path.style.strokeDashoffset = String(len);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Single owner for focus opacity + tour classes — call when stop index changes.
 * Avoids competing timeline opacity tweens that flicker mid-scrub.
 */
function applyStopFocus(
  gsap: GsapLike,
  world: HTMLElement,
  stop: JourneyStop | undefined,
  activeEdgeId: string | null,
) {
  const nodes = world.querySelectorAll<SVGGElement>("[data-node-id]");
  const edges = world.querySelectorAll<SVGGElement>("[data-edge-id]");
  const spotlight = new Set(stop?.spotlightIds ?? []);
  const focusId = stop?.focusNodeId ?? null;

  nodes.forEach((node) => {
    const id = node.getAttribute("data-node-id") || "";
    const isFocus = id === focusId;
    const isNear = spotlight.has(id) && !isFocus;
    const opacity = isFocus
      ? JOURNEY.nodeFull
      : isNear
        ? JOURNEY.nodeNear
        : JOURNEY.nodeDim;
    gsap.set(node, { opacity, overwrite: true });
    node.classList.toggle("is-tour-active", isFocus);
    node.classList.toggle("is-tour-revealed", isNear);
    node.classList.toggle("is-tour-dim", !isFocus && !isNear);
    node.classList.toggle("is-tour-cluster", Boolean(isNear && stop?.kind === "cluster"));
  });

  edges.forEach((edge) => {
    const id = edge.getAttribute("data-edge-id") || "";
    const isActive = Boolean(activeEdgeId && id === activeEdgeId);
    gsap.set(edge, {
      opacity: isActive ? JOURNEY.edgeFull : JOURNEY.edgeDim,
      overwrite: true,
    });
    edge.classList.toggle("is-tour-active", isActive);
    edge.classList.toggle("is-tour-revealed", false);
    edge.classList.toggle("is-tour-dim", !isActive);
  });
}

function buildCameraTimeline(
  gsap: GsapLike,
  camera: HTMLElement,
  world: HTMLElement,
  packet: HTMLElement | null,
  plan: JourneyPlan,
) {
  prepareEdgeDraw(world);
  applyPose(gsap, camera, plan.diveFromPose);
  applyStopFocus(gsap, world, undefined, null);
  if (packet) gsap.set(packet, { autoAlpha: 0 });

  const edgeMap = new Map(
    Array.from(world.querySelectorAll<SVGGElement>("[data-edge-id]")).map(
      (el) => [el.getAttribute("data-edge-id") || "", el] as const,
    ),
  );

  const tl = gsap.timeline({ defaults: { ease: "none" } });
  const beat = JOURNEY.beatDur;
  const diveDur = beat * JOURNEY.diveFrac;
  const holdDur = beat * JOURNEY.holdFrac;
  const travelDur = beat * JOURNEY.travelFrac;

  // Dive into first stop
  const first = plan.stops[0];
  if (first) {
    tl.to(
      camera,
      {
        x: first.pose.x,
        y: first.pose.y,
        scale: first.pose.scale,
        duration: diveDur,
        ease: "none",
      },
      0,
    );
    tl.to({}, { duration: holdDur }, diveDur);
  } else {
    tl.to({}, { duration: diveDur + holdDur }, 0);
  }

  plan.hops.forEach((hop, hopIndex) => {
    const t0 = diveDur + holdDur + hopIndex * (travelDur + holdDur);
    appendTravel(gsap, tl, t0, travelDur, hop, camera, packet, edgeMap);
    tl.to({}, { duration: holdDur }, t0 + travelDur);
  });

  tl.to({}, { duration: 0.08 });

  return tl;
}

function appendTravel(
  gsap: GsapLike,
  tl: TimelineLike,
  t0: number,
  travelDur: number,
  hop: JourneyHop,
  camera: HTMLElement,
  packet: HTMLElement | null,
  edgeMap: Map<string, SVGGElement>,
) {
  const edgeIds = hop.edgeIds.length > 0 ? hop.edgeIds : hop.edgeId ? [hop.edgeId] : [];
  const primaryEdgeEl = hop.edgeId ? edgeMap.get(hop.edgeId) : undefined;
  const path = primaryEdgeEl?.querySelector<SVGPathElement>(".arch-graph-edge-path");

  tl.fromTo(
    camera,
    {
      x: hop.fromPose.x,
      y: hop.fromPose.y,
      scale: hop.fromPose.scale,
    },
    {
      x: hop.toPose.x,
      y: hop.toPose.y,
      scale: hop.toPose.scale,
      duration: travelDur,
      ease: "none",
      immediateRender: false,
    },
    t0,
  );

  const edgeSlice = edgeIds.length > 0 ? travelDur / edgeIds.length : travelDur;
  edgeIds.forEach((eid, ei) => {
    const edgeEl = edgeMap.get(eid);
    if (!edgeEl) return;
    const at = t0 + ei * edgeSlice;
    // Stroke draw only — opacity owned by applyStopFocus (no competing tweens)
    const edgePath = edgeEl.querySelector<SVGPathElement>(".arch-graph-edge-path");
    if (edgePath && edgePath.dataset.dashed !== "1") {
      const len = Number(edgePath.dataset.pathLength || 0);
      tl.fromTo(
        edgePath,
        { strokeDashoffset: len },
        { strokeDashoffset: 0, duration: edgeSlice, ease: "none", immediateRender: false },
        at,
      );
    }
  });

  if (packet && path) {
    try {
      const len = path.getTotalLength();
      const tweenState = { p: 0 };
      gsap.set(packet, { autoAlpha: 1, x: 0, y: 0 });
      tl.fromTo(
        tweenState,
        { p: 0 },
        {
          p: 1,
          duration: travelDur,
          ease: "none",
          immediateRender: false,
          onUpdate: () => {
            const pt = path.getPointAtLength(tweenState.p * len);
            gsap.set(packet, { x: pt.x, y: pt.y });
          },
        },
        t0,
      );
      tl.to(packet, { autoAlpha: 0, duration: 0.06 }, t0 + travelDur);
    } catch {
      /* path not measurable */
    }
  }
}

/**
 * Scroll-driven architecture journey: one node/cluster owns the viewport;
 * scrub moves the camera along edges; snap rests on readable holds.
 * Presentation: full-bleed void stage (no doc panel / “How it works” chapter).
 */
export function ArchitectureJourney({ title, graph, sourceNote }: ArchitectureJourneyProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const itemsRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [captionIndex, setCaptionIndex] = useState(0);
  const captionIndexRef = useRef(0);
  const [viewportSize, setViewportSize] = useState({ width: 720, height: 420 });
  const mobileGoToRef = useRef<((index: number) => void) | null>(null);
  const reactId = useId();
  const headingId = `arch-journey-heading-${reactId.replace(/:/g, "")}`;

  const steps = useMemo(() => resolveTourStepsFromGraph(graph), [graph]);
  const plan = useMemo(
    () => planArchitectureJourney(graph, viewportSize),
    [graph, viewportSize],
  );

  useEffect(() => {
    captionIndexRef.current = captionIndex;
  }, [captionIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const viewport = viewportRef.current;
    const camera = cameraRef.current;
    const world = worldRef.current;
    if (!section || !stage || !viewport || !camera || !world) return;

    let ctx: { revert: () => void } | null = null;
    let mm: MatchMediaHandle | null = null;
    let cancelled = false;

    const paintCaption = (index: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, index));
      if (clamped !== captionIndexRef.current) {
        captionIndexRef.current = clamped;
        setCaptionIndex(clamped);
      }
      const step = steps[clamped];
      if (indexRef.current) {
        indexRef.current.textContent = `${String(clamped + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
      }
      if (titleRef.current && step) {
        titleRef.current.textContent = step.title;
      }
      if (bodyRef.current) {
        bodyRef.current.textContent = step?.body ?? "";
        bodyRef.current.hidden = !step?.body;
      }
      if (itemsRef.current) {
        itemsRef.current.replaceChildren();
        if (step?.items?.length) {
          itemsRef.current.hidden = false;
          for (const item of step.items) {
            const li = document.createElement("li");
            li.textContent = item;
            itemsRef.current.appendChild(li);
          }
        } else {
          itemsRef.current.hidden = true;
        }
      }
    };

    async function mount() {
      paintCaption(0);

      if (prefersReducedMotion()) {
        return;
      }

      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (cancelled || !section || !stage || !viewport || !camera || !world) return;

      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled) return;

      const gsap = gsapMod.default;
      const { ScrollTrigger } = stMod;
      gsap.registerPlugin(ScrollTrigger);

      const livePlan = planArchitectureJourney(graph, {
        width: viewport.clientWidth || viewportSize.width,
        height: viewport.clientHeight || viewportSize.height,
      });

      ctx = gsap.context(() => {
        mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: reduce)", () => {
          paintCaption(0);
        });

        // Mobile / coarse: stepped camera (no punishing pin)
        mm.add(
          "(prefers-reduced-motion: no-preference) and ((max-width: 1023px) or (pointer: coarse))",
          () => {
            applyPose(gsap, camera, livePlan.startPose);
            prepareEdgeDraw(world);
            const startStop = livePlan.stops[0];
            applyStopFocus(gsap, world, startStop, null);

            gsap.fromTo(
              stage,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                duration: MOTION.medium,
                ease: MOTION.ease,
                scrollTrigger: {
                  trigger: section,
                  start: "top 78%",
                  toggleActions: "play reverse play reverse",
                  refreshPriority: 3,
                },
              },
            );
            gsap.fromTo(
              camera,
              {
                x: livePlan.diveFromPose.x,
                y: livePlan.diveFromPose.y,
                scale: livePlan.diveFromPose.scale,
              },
              {
                x: livePlan.startPose.x,
                y: livePlan.startPose.y,
                scale: livePlan.startPose.scale,
                duration: MOTION.slow,
                ease: MOTION.ease,
                transformOrigin: "0 0",
                scrollTrigger: {
                  trigger: section,
                  start: "top 78%",
                  toggleActions: "play reverse play reverse",
                  refreshPriority: 3,
                },
              },
            );

            const goToStop = (index: number) => {
              const clamped = Math.max(0, Math.min(steps.length - 1, index));
              paintCaption(clamped);
              const stop = livePlan.stops[clamped];
              if (!stop) return;

              gsap.to(camera, {
                x: stop.pose.x,
                y: stop.pose.y,
                scale: stop.pose.scale,
                duration: MOTION.medium,
                ease: MOTION.ease,
                transformOrigin: "0 0",
                overwrite: true,
              });

              const prevHop = livePlan.hops.find((h) => h.toIndex === clamped);
              applyStopFocus(gsap, world, stop, prevHop?.edgeId ?? null);
            };

            mobileGoToRef.current = goToStop;
            return () => {
              mobileGoToRef.current = null;
            };
          },
        );

        // Desktop + fine: pin + scrub camera path + snap to holds
        mm.add(
          "(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (pointer: fine)",
          () => {
            const n = Math.max(steps.length, 1);
            paintCaption(0);
            applyStopFocus(gsap, world, livePlan.stops[0], null);

            gsap.fromTo(
              stage,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top 72%",
                  end: JOURNEY.pinStart,
                  scrub: 0.35,
                  refreshPriority: 2,
                },
              },
            );

            // Subtle caption depth vs world (parallax-lite)
            if (captionRef.current) {
              gsap.fromTo(
                captionRef.current,
                { y: 10 },
                {
                  y: -14,
                  ease: "none",
                  scrollTrigger: {
                    trigger: section,
                    start: JOURNEY.pinStart,
                    end: `+=${livePlan.pinVh * 100}%`,
                    scrub: JOURNEY.scrub,
                    refreshPriority: 2,
                  },
                },
              );
            }

            const drawTl = buildCameraTimeline(
              gsap,
              camera,
              world,
              packetRef.current,
              livePlan,
            );

            let lastFocus = -1;

            const master = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: JOURNEY.pinStart,
                end: `+=${livePlan.pinVh * 100}%`,
                pin: true,
                pinSpacing: true,
                scrub: JOURNEY.scrub,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                refreshPriority: 3,
                ...(n > 1
                  ? {
                      snap: {
                        snapTo: (value: number) => {
                          const snaps = livePlan.snapProgress;
                          if (snaps.length === 0) return value;
                          let best = snaps[0];
                          let bestDist = Math.abs(value - best);
                          for (let i = 1; i < snaps.length; i++) {
                            const d = Math.abs(value - snaps[i]);
                            if (d < bestDist) {
                              bestDist = d;
                              best = snaps[i];
                            }
                          }
                          return best;
                        },
                        duration: {
                          min: JOURNEY.snapDurationMin,
                          max: JOURNEY.snapDurationMax,
                        },
                        delay: JOURNEY.snapDelay,
                        ease: MOTION.easeInOut,
                        directional: true,
                      },
                    }
                  : {}),
                onUpdate: (self) => {
                  const idx = stopIndexForProgress(
                    self.progress,
                    livePlan.snapProgress,
                  );
                  paintCaption(idx);
                  if (idx !== lastFocus) {
                    lastFocus = idx;
                    const stop = livePlan.stops[idx];
                    const hop = livePlan.hops.find((h) => h.toIndex === idx);
                    applyStopFocus(gsap, world, stop, hop?.edgeId ?? null);
                  }
                },
                onRefresh: () => {
                  prepareEdgeDraw(world);
                },
              },
            });

            master.add(drawTl, 0);
          },
        );
      }, section);

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    void mount();

    return () => {
      cancelled = true;
      mm?.revert();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, steps, plan.pinVh, viewportSize.width, viewportSize.height]);

  const current = steps[captionIndex];

  function openOverlay() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeOverlay() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function handleStep(index: number) {
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    setCaptionIndex(clamped);
    captionIndexRef.current = clamped;
    if (mobileGoToRef.current) {
      mobileGoToRef.current(clamped);
    }
  }

  return (
    <section
      ref={sectionRef}
      className="arch-journey-section"
      aria-labelledby={headingId}
      data-exhibit-act="diagram"
      data-walkthrough="1"
      data-diagram-mode="owned"
      data-journey="1"
    >
      <h2 id={headingId} className="visually-hidden">
        Architecture path
      </h2>

      {/* Full-bleed void stage — Atmosphere shows through; no panel chrome */}
      <div ref={stageRef} className="arch-journey-stage" data-journey-stage>
        <div ref={captionRef} className="arch-journey-caption" aria-live="polite">
          <span ref={indexRef} className="arch-journey-index">
            {current
              ? `${String(captionIndex + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`
              : "—"}
          </span>
          <p ref={titleRef} className="arch-journey-label">
            {current?.title ?? ""}
          </p>
          <p
            ref={bodyRef}
            className="arch-journey-body"
            hidden={!current?.body}
          >
            {current?.body ?? ""}
          </p>
          <ul
            ref={itemsRef}
            className="arch-journey-items"
            hidden={!current?.items?.length}
          >
            {current?.items?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div
          ref={viewportRef}
          className="arch-journey-viewport"
          data-diagram-panel
          data-journey-viewport
        >
          <div
            ref={cameraRef}
            className="arch-journey-camera"
            data-diagram-stage
            data-journey-camera
          >
            <div ref={worldRef} className="arch-journey-world" data-journey-world>
              <ArchitectureGraphView
                graph={graph}
                layout={plan.layout}
                worldSized
                ariaLabel={`Architecture for ${title}`}
              />
              <div
                ref={packetRef}
                className="arch-journey-packet"
                data-journey-packet
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Mobile / coarse: stepped controls only — hidden on desktop scrub */}
        <div className="arch-journey-controls" data-journey-controls>
          <div className="arch-journey-dots" role="tablist" aria-label="Architecture steps">
            {steps.map((step, i) => (
              <button
                key={step.id}
                type="button"
                className={`arch-journey-dot${i === captionIndex ? " is-active" : ""}`}
                data-journey-step={i}
                role="tab"
                aria-label={`Step ${i + 1}: ${step.title}`}
                aria-current={i === captionIndex ? "step" : undefined}
                onClick={() => handleStep(i)}
              />
            ))}
          </div>
          <div className="arch-journey-switcher">
            <button
              type="button"
              className="arch-journey-nav"
              aria-label="Previous step"
              disabled={captionIndex <= 0}
              onClick={() => handleStep(captionIndex - 1)}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="arch-journey-nav"
              aria-label="Next step"
              disabled={captionIndex >= steps.length - 1}
              onClick={() => handleStep(captionIndex + 1)}
            >
              Next →
            </button>
          </div>
        </div>

        <button type="button" className="arch-journey-escape" onClick={openOverlay}>
          Full map
        </button>
      </div>

      {/* Reduced-motion / sr: readable path + static full graph */}
      <ol className="arch-journey-list" data-walk-list>
        {steps.map((step, i) => (
          <li key={step.id} className={i === captionIndex ? "is-active" : undefined}>
            <span className="arch-journey-list-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="arch-journey-list-title">{step.title}</p>
              {step.body ? (
                <p className="arch-journey-list-body">{step.body}</p>
              ) : null}
              {step.items?.length ? (
                <ul className="arch-journey-list-items">
                  {step.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="arch-journey-static" data-walk-static-graph>
        <p className="arch-journey-static-note">{sourceNote}</p>
        {graph.notes ? <p className="arch-journey-static-note">{graph.notes}</p> : null}
        <ArchitectureGraphView
          graph={graph}
          ariaLabel={`Full architecture for ${title}`}
          staticFull
        />
      </div>

      <dialog
        ref={dialogRef}
        className="project-walk-overlay"
        aria-labelledby={`${headingId}-overlay`}
      >
        <div className="project-walk-overlay-chrome">
          <h3 id={`${headingId}-overlay`} className="project-walk-overlay-title">
            Full architecture
          </h3>
          <button type="button" className="project-walk-overlay-close" onClick={closeOverlay}>
            Close
          </button>
        </div>
        <div className="project-walk-overlay-body">
          <ArchitectureGraphView
            graph={graph}
            svgClassName="project-diagram-svg--overlay"
            ariaLabel={`Full architecture for ${title}`}
            staticFull
          />
        </div>
      </dialog>
    </section>
  );
}
