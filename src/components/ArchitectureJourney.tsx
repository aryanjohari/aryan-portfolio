"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ArchitectureGraphView } from "@/components/ArchitectureGraphView";
import type { ArchitectureGraph, GraphNodeKind } from "@/lib/architecture-graph";
import { resolveArchitectureSkin } from "@/lib/architecture-graph";
import {
  OVERVIEW_STORY,
  JOURNEY,
  planArchitectureJourney,
  planDiveJourney,
  type CameraPose,
  type JourneyPlan,
  type JourneyStop,
} from "@/lib/architecture-journey";
import { resolveTourStepsFromGraph } from "@/lib/architecture-walkthrough";
import { MOTION, prefersReducedMotion } from "@/lib/motion";

type ArchitectureJourneyProps = {
  title: string;
  graph: ArchitectureGraph;
  sourceNote: string;
  /** Project slug — drives skin when graph.skin is omitted. */
  slug?: string;
};

const KIND_LABEL: Record<GraphNodeKind, string> = {
  input: "Input",
  process: "Process",
  decision: "Decision",
  store: "Store",
  output: "Output",
  other: "Node",
};

type GsapLike = typeof import("gsap").default;

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
 * Single owner for focus opacity + tour classes.
 * Overview: soft spotlight. Dive: harder focus on one stop.
 */
function applyStopFocus(
  gsap: GsapLike,
  world: HTMLElement,
  stop: JourneyStop | undefined,
  mode: JourneyPlan["mode"] = "overview-story",
  options: { revealAll?: boolean } = {},
) {
  const nodes = world.querySelectorAll<SVGGElement>("[data-node-id]");
  const edges = world.querySelectorAll<SVGGElement>("[data-edge-id]");
  const spotlight = new Set(stop?.spotlightIds ?? []);
  const focusId = stop?.focusNodeId ?? null;
  const activeEdges = new Set((stop?.edgeIds ?? []).filter(Boolean));
  const isOverview = mode === "overview-story";

  if (options.revealAll || !stop) {
    nodes.forEach((node) => {
      gsap.set(node, {
        opacity: isOverview ? OVERVIEW_STORY.overviewNode : JOURNEY.nodeFull,
        overwrite: true,
      });
      node.classList.toggle("is-tour-active", false);
      node.classList.toggle("is-tour-revealed", true);
      node.classList.toggle("is-tour-dim", false);
      node.classList.toggle("is-tour-cluster", false);
    });
    edges.forEach((edge) => {
      gsap.set(edge, {
        opacity: isOverview ? OVERVIEW_STORY.overviewEdge : JOURNEY.edgeNear,
        overwrite: true,
      });
      edge.classList.toggle("is-tour-active", false);
      edge.classList.toggle("is-tour-revealed", true);
      edge.classList.toggle("is-tour-dim", false);
    });
    return;
  }

  const dim = isOverview ? OVERVIEW_STORY.nodeDim : JOURNEY.nodeDim;
  const near = isOverview ? OVERVIEW_STORY.nodeNear : JOURNEY.nodeNear;
  const full = isOverview ? OVERVIEW_STORY.nodeFull : JOURNEY.nodeFull;
  const edgeDim = isOverview ? OVERVIEW_STORY.edgeDim : JOURNEY.edgeDim;
  const edgeFull = isOverview ? OVERVIEW_STORY.edgeFull : JOURNEY.edgeFull;

  nodes.forEach((node) => {
    const id = node.getAttribute("data-node-id") || "";
    const isSpot = isOverview ? spotlight.has(id) : id === focusId;
    const isNear = isOverview ? false : spotlight.has(id) && id !== focusId;
    const opacity = isSpot ? full : isNear ? near : dim;
    gsap.set(node, { opacity, overwrite: true });
    node.classList.toggle("is-tour-active", isSpot);
    node.classList.toggle(
      "is-tour-revealed",
      isNear || (isOverview && isSpot && spotlight.size > 1),
    );
    node.classList.toggle("is-tour-dim", !isSpot && !isNear);
    node.classList.toggle(
      "is-tour-cluster",
      Boolean(isOverview ? isSpot && spotlight.size > 1 : isNear),
    );
  });

  edges.forEach((edge) => {
    const id = edge.getAttribute("data-edge-id") || "";
    const isActive = activeEdges.has(id);
    gsap.set(edge, {
      opacity: isActive ? edgeFull : edgeDim,
      overwrite: true,
    });
    edge.classList.toggle("is-tour-active", isActive);
    edge.classList.toggle("is-tour-revealed", false);
    edge.classList.toggle("is-tour-dim", !isActive);
  });
}

function softRevealEdges(gsap: GsapLike, world: HTMLElement) {
  prepareEdgeDraw(world);
  const edges = world.querySelectorAll<SVGGElement>("[data-edge-id]");
  const tl = gsap.timeline({ defaults: { ease: "none" } });
  edges.forEach((edge) => {
    const path = edge.querySelector<SVGPathElement>(".arch-graph-edge-path");
    if (path && path.dataset.dashed !== "1") {
      const len = Number(path.dataset.pathLength || 0);
      if (len > 0) {
        tl.fromTo(
          path,
          { strokeDashoffset: len },
          { strokeDashoffset: 0, duration: MOTION.slow },
          0,
        );
      }
    }
  });
  return tl;
}

/**
 * Overview-first architecture: full map + path story, optional dive takeover.
 * No forced pin / scrub camera on the default path.
 */
export function ArchitectureJourney({
  title,
  graph,
  sourceNote,
  slug,
}: ArchitectureJourneyProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const skin = resolveArchitectureSkin(graph, slug);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const diveViewportRef = useRef<HTMLDivElement>(null);
  const diveCameraRef = useRef<HTMLDivElement>(null);
  const diveWorldRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [beatIndex, setBeatIndex] = useState(0);
  const [diveIndex, setDiveIndex] = useState(0);
  const [diveOpen, setDiveOpen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 720, height: 420 });
  const [diveViewportSize, setDiveViewportSize] = useState({ width: 720, height: 480 });
  const gsapRef = useRef<GsapLike | null>(null);
  const reactId = useId();
  const headingId = `arch-journey-heading-${reactId.replace(/:/g, "")}`;
  const diveTitleId = `${headingId}-dive`;

  const steps = useMemo(() => resolveTourStepsFromGraph(graph), [graph]);
  const overviewPlan = useMemo(
    () => planArchitectureJourney({ ...graph, journeyMode: "overview-story" }, viewportSize),
    [graph, viewportSize],
  );
  const divePlan = useMemo(
    () => planDiveJourney(graph, diveViewportSize),
    [graph, diveViewportSize],
  );

  const summary =
    graph.summary?.trim() ||
    (graph.title
      ? `Here’s how ${graph.title} works end to end.`
      : "Here’s how the system works end to end.");

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setViewportSize((prev) => {
        if (
          Math.abs(prev.width - rect.width) < 12 &&
          Math.abs(prev.height - rect.height) < 12
        ) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(viewport);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!diveOpen) return;
    const viewport = diveViewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setDiveViewportSize((prev) => {
        if (
          Math.abs(prev.width - rect.width) < 12 &&
          Math.abs(prev.height - rect.height) < 12
        ) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(viewport);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [diveOpen]);

  // Overview mount: fit once; soft fade + edge draw when the stage enters view
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const world = worldRef.current;
    if (!section || !stage || !camera || !world) return;

    const sectionEl = section;
    const stageEl = stage;
    const cameraEl = camera;
    const worldEl = world;

    let cancelled = false;
    let ctx: { revert: () => void } | null = null;
    let edgeTl: { kill: () => void } | null = null;
    let io: IntersectionObserver | null = null;

    async function mount() {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (cancelled) return;

      const livePlan = planArchitectureJourney(
        { ...graph, journeyMode: "overview-story" },
        {
          width: viewportRef.current?.clientWidth || viewportSize.width,
          height: viewportRef.current?.clientHeight || viewportSize.height,
        },
      );

      if (prefersReducedMotion()) {
        cameraEl.style.transform = `translate(${livePlan.startPose.x}px, ${livePlan.startPose.y}px) scale(${livePlan.startPose.scale})`;
        cameraEl.style.transformOrigin = "0 0";
        stageEl.style.opacity = "1";
        const first = livePlan.stops[0];
        if (first) {
          const nodes = worldEl.querySelectorAll<SVGGElement>("[data-node-id]");
          const edges = worldEl.querySelectorAll<SVGGElement>("[data-edge-id]");
          const spotlight = new Set(first.spotlightIds ?? []);
          const activeEdges = new Set(first.edgeIds ?? []);
          nodes.forEach((node) => {
            const id = node.getAttribute("data-node-id") || "";
            const isSpot = spotlight.has(id);
            node.classList.toggle("is-tour-active", isSpot);
            node.classList.toggle("is-tour-dim", !isSpot);
            node.style.opacity = isSpot ? "1" : "0.35";
          });
          edges.forEach((edge) => {
            const id = edge.getAttribute("data-edge-id") || "";
            const isActive = activeEdges.has(id);
            edge.classList.toggle("is-tour-active", isActive);
            edge.classList.toggle("is-tour-dim", !isActive);
            edge.style.opacity = isActive ? "0.95" : "0.18";
          });
        }
        return;
      }

      const gsapMod = await import("gsap");
      if (cancelled) return;
      const gsap = gsapMod.default;
      gsapRef.current = gsap;

      ctx = gsap.context(() => {
        applyPose(gsap, cameraEl, livePlan.startPose);
        applyStopFocus(gsap, worldEl, undefined, "overview-story", { revealAll: true });
        gsap.set(stageEl, { autoAlpha: 0 });
        prepareEdgeDraw(worldEl);

        const playEnter = () => {
          if (cancelled) return;
          const entrance = gsap.timeline({ defaults: { ease: MOTION.ease } });
          entrance.to(stageEl, { autoAlpha: 1, duration: MOTION.medium }, 0);
          edgeTl?.kill();
          edgeTl = softRevealEdges(gsap, worldEl);
          const first = livePlan.stops[0];
          if (first) {
            entrance.add(() => {
              applyStopFocus(gsap, worldEl, first, "overview-story");
            }, "-=0.1");
          }
        };

        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              io?.disconnect();
              io = null;
              playEnter();
            }
          },
          { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
        );
        io.observe(stageEl);
      }, sectionEl);
    }

    void mount();

    return () => {
      cancelled = true;
      io?.disconnect();
      edgeTl?.kill();
      ctx?.revert();
    };
  }, [graph, viewportSize.width, viewportSize.height]);

  // Overview beat highlight crossfade (no camera travel)
  useEffect(() => {
    const world = worldRef.current;
    if (!world || diveOpen) return;

    const stop = overviewPlan.stops[beatIndex];
    const gsap = gsapRef.current;

    if (!gsap || prefersReducedMotion()) {
      const nodes = world.querySelectorAll<SVGGElement>("[data-node-id]");
      const edges = world.querySelectorAll<SVGGElement>("[data-edge-id]");
      const spotlight = new Set(stop?.spotlightIds ?? []);
      const activeEdges = new Set(stop?.edgeIds ?? []);
      nodes.forEach((node) => {
        const id = node.getAttribute("data-node-id") || "";
        const isSpot = spotlight.has(id);
        node.classList.toggle("is-tour-active", isSpot);
        node.classList.toggle("is-tour-dim", !isSpot);
        node.classList.toggle("is-tour-revealed", isSpot && spotlight.size > 1);
        node.classList.toggle("is-tour-cluster", isSpot && spotlight.size > 1);
        node.style.opacity = isSpot ? "1" : "0.35";
      });
      edges.forEach((edge) => {
        const id = edge.getAttribute("data-edge-id") || "";
        const isActive = activeEdges.has(id);
        edge.classList.toggle("is-tour-active", isActive);
        edge.classList.toggle("is-tour-dim", !isActive);
        edge.style.opacity = isActive ? "0.95" : "0.18";
      });
      return;
    }

    const nodes = world.querySelectorAll<SVGGElement>("[data-node-id]");
    const edges = world.querySelectorAll<SVGGElement>("[data-edge-id]");
    const spotlight = new Set(stop?.spotlightIds ?? []);
    const activeEdges = new Set((stop?.edgeIds ?? []).filter(Boolean));

    const dim = OVERVIEW_STORY.nodeDim;
    const full = OVERVIEW_STORY.nodeFull;
    const edgeDim = OVERVIEW_STORY.edgeDim;
    const edgeFull = OVERVIEW_STORY.edgeFull;

    nodes.forEach((node) => {
      const id = node.getAttribute("data-node-id") || "";
      const isSpot = spotlight.has(id);
      gsap.to(node, {
        opacity: isSpot ? full : dim,
        duration: MOTION.fast,
        ease: MOTION.ease,
        overwrite: true,
      });
      node.classList.toggle("is-tour-active", isSpot);
      node.classList.toggle(
        "is-tour-revealed",
        isSpot && spotlight.size > 1,
      );
      node.classList.toggle("is-tour-dim", !isSpot);
      node.classList.toggle(
        "is-tour-cluster",
        Boolean(isSpot && spotlight.size > 1),
      );
    });

    edges.forEach((edge) => {
      const id = edge.getAttribute("data-edge-id") || "";
      const isActive = activeEdges.has(id);
      gsap.to(edge, {
        opacity: isActive ? edgeFull : edgeDim,
        duration: MOTION.fast,
        ease: MOTION.ease,
        overwrite: true,
      });
      edge.classList.toggle("is-tour-active", isActive);
      edge.classList.toggle("is-tour-revealed", false);
      edge.classList.toggle("is-tour-dim", !isActive);
    });
  }, [beatIndex, overviewPlan.stops, diveOpen]);

  // Dive focus when open / index changes
  useEffect(() => {
    if (!diveOpen) return;
    const camera = diveCameraRef.current;
    const world = diveWorldRef.current;
    if (!camera || !world) return;

    let cancelled = false;

    async function paint() {
      const gsapMod = gsapRef.current ? null : await import("gsap");
      if (cancelled) return;
      const gsap = gsapRef.current ?? gsapMod!.default;
      gsapRef.current = gsap;

      const live = planDiveJourney(graph, {
        width: diveViewportRef.current?.clientWidth || diveViewportSize.width,
        height: diveViewportRef.current?.clientHeight || diveViewportSize.height,
      });
      const stop = live.stops[diveIndex] ?? live.stops[0];
      if (!stop) return;

      if (prefersReducedMotion()) {
        applyPose(gsap, camera!, stop.pose);
        applyStopFocus(gsap, world!, stop, "camera");
        return;
      }

      applyStopFocus(gsap, world!, stop, "camera");
      gsap.to(camera!, {
        x: stop.pose.x,
        y: stop.pose.y,
        scale: stop.pose.scale,
        duration: MOTION.medium,
        ease: MOTION.ease,
        transformOrigin: "0 0",
        overwrite: true,
      });
    }

    void paint();
    return () => {
      cancelled = true;
    };
  }, [diveOpen, diveIndex, divePlan, diveViewportSize, graph]);

  useEffect(() => {
    if (!diveOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDive();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setDiveIndex((i) => Math.min(steps.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setDiveIndex((i) => Math.max(0, i - 1));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [diveOpen, steps.length]);

  function openDive(fromBeat = beatIndex) {
    const dialog = dialogRef.current;
    setDiveIndex(Math.max(0, Math.min(steps.length - 1, fromBeat)));
    setDiveOpen(true);
    if (dialog) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
  }

  function closeDive() {
    const dialog = dialogRef.current;
    setDiveOpen(false);
    if (dialog) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }

  const currentBeat = overviewPlan.captions[beatIndex] ?? steps[beatIndex];
  const diveCaption = divePlan.captions[diveIndex] ?? steps[diveIndex];
  const diveStop = divePlan.stops[diveIndex];
  const diveFocusNode = diveStop
    ? graph.nodes.find((n) => n.id === diveStop.focusNodeId)
    : undefined;
  const diveKind: GraphNodeKind = diveFocusNode?.kind ?? "other";

  return (
    <section
      ref={sectionRef}
      className="arch-journey-section is-overview-story"
      aria-labelledby={headingId}
      data-exhibit-act="diagram"
      data-walkthrough="1"
      data-diagram-mode="owned"
      data-journey="1"
      data-journey-mode="overview-story"
      data-arch-skin={skin}
    >
      <div className="arch-overview-header project-exhibit-rail">
        <h2 id={headingId} className="project-exhibit-section-title">
          How it works
        </h2>
        <p className="arch-overview-summary">{summary}</p>
        {sourceNote ? <p className="arch-overview-source">{sourceNote}</p> : null}
        {graph.notes ? <p className="arch-overview-source">{graph.notes}</p> : null}
      </div>

      <div className="arch-overview-layout">
        <ol className="arch-path-story" aria-label="Path story">
          {overviewPlan.captions.map((caption, i) => (
            <li key={caption.id}>
              <button
                type="button"
                className={`arch-path-beat${i === beatIndex ? " is-active" : ""}`}
                aria-current={i === beatIndex ? "step" : undefined}
                onClick={() => setBeatIndex(i)}
              >
                <span className="arch-path-beat-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="arch-path-beat-copy">
                  <span className="arch-path-beat-title">{caption.title}</span>
                  <span className="arch-path-beat-body">{caption.body}</span>
                  {caption.items?.length ? (
                    <ul className="arch-path-beat-items">
                      {caption.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div ref={stageRef} className="arch-journey-stage" data-journey-stage>
          <div
            ref={viewportRef}
            className="arch-journey-viewport"
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
                  layout={overviewPlan.layout}
                  worldSized
                  slug={slug}
                  skin={skin}
                  ariaLabel={`Architecture for ${title}`}
                />
              </div>
            </div>
          </div>

          <p className="arch-overview-active" aria-live="polite">
            <span className="arch-journey-index">
              {String(beatIndex + 1).padStart(2, "0")} /{" "}
              {String(Math.max(steps.length, 1)).padStart(2, "0")}
            </span>
            <span className="arch-overview-active-title">{currentBeat?.title ?? ""}</span>
          </p>
        </div>
      </div>

      <div className="arch-overview-actions project-exhibit-rail">
        <button
          type="button"
          className="arch-dive-open"
          onClick={() => openDive(beatIndex)}
        >
          Dive into architecture
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="arch-dive-dialog"
        aria-labelledby={diveTitleId}
        data-arch-skin={skin}
        onClose={() => setDiveOpen(false)}
      >
        <div className="arch-dive-chrome">
          <div className="arch-dive-chrome-copy">
            <p id={diveTitleId} className="arch-dive-kicker">
              Architecture dive
            </p>
            <p className="arch-dive-caption-title">{diveCaption?.title ?? ""}</p>
            <p className="arch-dive-caption-body" hidden={!diveCaption?.body}>
              {diveCaption?.body ?? ""}
            </p>
            {diveCaption?.items?.length ? (
              <ul className="arch-dive-caption-items">
                {diveCaption.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="button" className="arch-dive-close" onClick={closeDive}>
            Exit dive
          </button>
        </div>

        <div
          ref={diveViewportRef}
          className="arch-dive-viewport"
          data-dive-viewport
        >
          <article
            className={`arch-dive-focus-card arch-dive-focus-card--${diveKind}`}
            data-kind={diveKind}
            aria-hidden="true"
          >
            <span className="arch-dive-focus-kind">{KIND_LABEL[diveKind]}</span>
            <p className="arch-dive-focus-title">
              {diveFocusNode?.label ?? diveCaption?.title ?? ""}
            </p>
            {diveCaption?.items && diveCaption.items.length > 0 ? (
              <ul className="arch-dive-focus-items">
                {diveCaption.items.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
          <div
            ref={diveCameraRef}
            className="arch-journey-camera"
            data-dive-camera
          >
            <div ref={diveWorldRef} className="arch-journey-world">
              {diveOpen ? (
                <ArchitectureGraphView
                  graph={graph}
                  layout={divePlan.layout}
                  worldSized
                  slug={slug}
                  skin={skin}
                  ariaLabel={`Dive architecture for ${title}`}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="arch-dive-controls">
          <span className="arch-journey-index">
            {String(diveIndex + 1).padStart(2, "0")} /{" "}
            {String(Math.max(steps.length, 1)).padStart(2, "0")}
          </span>
          <div className="arch-dive-nav">
            <button
              type="button"
              className="arch-journey-nav"
              aria-label="Previous stop"
              disabled={diveIndex <= 0}
              onClick={() => setDiveIndex((i) => Math.max(0, i - 1))}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="arch-journey-nav"
              aria-label="Next stop"
              disabled={diveIndex >= steps.length - 1}
              onClick={() => setDiveIndex((i) => Math.min(steps.length - 1, i + 1))}
            >
              Next →
            </button>
          </div>
          <div className="arch-journey-dots" role="tablist" aria-label="Dive stops">
            {steps.map((step, i) => (
              <button
                key={step.id}
                type="button"
                className={`arch-journey-dot${i === diveIndex ? " is-active" : ""}`}
                role="tab"
                aria-label={`Stop ${i + 1}: ${step.title}`}
                aria-current={i === diveIndex ? "step" : undefined}
                onClick={() => setDiveIndex(i)}
              />
            ))}
          </div>
        </div>
      </dialog>
    </section>
  );
}
