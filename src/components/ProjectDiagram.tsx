"use client";

import { useEffect, useId, useRef, useState } from "react";

import { buildBaseDiagramSvg } from "@/data/base-diagram";
import {
  findHighlightElements,
  normalizeAuthoredSteps,
  pickFocusNode,
  resolveWalkthroughSteps,
  type WalkthroughStep,
} from "@/lib/architecture-walkthrough";
import { MOTION, prefersReducedMotion } from "@/lib/motion";
import type { ProjectDiagramData } from "@/lib/projects";

type ProjectDiagramProps = {
  title: string;
  diagram: ProjectDiagramData;
};

type GsapLike = typeof import("gsap").default;

type MatchMediaHandle = {
  add: (query: string, handler: () => void) => unknown;
  revert: () => void;
};

type CameraPose = { x: number; y: number; scale: number };

/** Tunables — short pin, mild focus, reversible scrub. */
const WALK = {
  pinVh: 1.15,
  scrub: 0.55,
  pinStart: "top top+=72",
  scaleMin: 1,
  scaleFocus: 1.28,
  scaleFocusMax: 1.42,
  nodeDim: 0.28,
  nodeFull: 1,
  edgeDim: 0.22,
  edgeFull: 0.85,
  depthRestY: 8,
  depthLiftY: 0,
  depthRestShadow: "0 2px 8px rgba(0,0,0,0.18)",
  depthLiftShadow: "0 16px 36px rgba(0,0,0,0.42), 0 1px 0 rgba(242,240,235,0.05)",
  chromeRestOpacity: 0.4,
  chromeFullOpacity: 1,
  snapDuration: 0.28,
} as const;

async function renderMermaidToSvg(mermaidSource: string, id: string): Promise<string | null> {
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    });
    const { svg } = await mermaid.render(`project-diagram-${id}`, mermaidSource);
    return svg;
  } catch {
    return null;
  }
}

function collectOpacityTargets(root: HTMLElement): SVGElement[] {
  return Array.from(
    root.querySelectorAll<SVGElement>("[data-diagram-node], .node, .cluster"),
  ).filter((el) => {
    if (el.closest("defs")) return false;
    const tag = el.tagName.toLowerCase();
    return (
      tag === "g" ||
      tag === "rect" ||
      el.classList.contains("node") ||
      el.classList.contains("cluster")
    );
  });
}

function collectEdges(root: HTMLElement): SVGElement[] {
  return Array.from(
    root.querySelectorAll<SVGElement>(
      "[data-diagram-edge], .edgePath, .flowchart-link, path.transition",
    ),
  ).filter((el) => !el.closest("defs") && !el.closest("marker"));
}

function nodeCenterInCamera(node: Element, camera: HTMLElement): { x: number; y: number } {
  const camRect = camera.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return {
    x: nodeRect.left + nodeRect.width / 2 - camRect.left,
    y: nodeRect.top + nodeRect.height / 2 - camRect.top,
  };
}

function poseForPoint(
  viewport: HTMLElement,
  focusX: number,
  focusY: number,
  scale: number,
): CameraPose {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  return {
    scale,
    x: vw / 2 - focusX * scale,
    y: vh / 2 - focusY * scale,
  };
}

function buildPoses(
  viewport: HTMLElement,
  camera: HTMLElement,
  steps: WalkthroughStep[],
  gsap: GsapLike,
): CameraPose[] {
  gsap.set(camera, { x: 0, y: 0, scale: 1, transformOrigin: "0 0" });
  return steps.map((step, i) => {
    const focus = pickFocusNode(camera, step, i, steps.length);
    if (!focus) return { x: 0, y: 0, scale: WALK.scaleMin };
    const scale = i === Math.floor(steps.length / 2) ? WALK.scaleFocusMax : WALK.scaleFocus;
    const { x, y } = nodeCenterInCamera(focus, camera);
    return poseForPoint(viewport, x, y, scale);
  });
}

function applySpotlight(
  camera: HTMLElement,
  nodes: SVGElement[],
  edges: SVGElement[],
  steps: WalkthroughStep[],
  stepIndex: number,
) {
  const step = steps[stepIndex];
  if (!step) return;

  const focus = pickFocusNode(camera, step, stepIndex, steps.length);
  const highlighted = findHighlightElements(camera, step);
  const bright = highlighted.length > 0 ? highlighted : focus ? [focus] : [];

  for (const node of nodes) {
    node.style.opacity = String(bright.includes(node) ? WALK.nodeFull : WALK.nodeDim);
  }
  for (const edge of edges) {
    edge.style.opacity = String(WALK.edgeDim);
  }

  if (bright.length > 0) {
    for (const edge of edges) {
      const parent = edge.closest(".edgePath, .flowchart-link, g");
      const id = `${edge.id} ${parent?.id || ""}`.toLowerCase();
      const hit = bright.some((n) => {
        const nid = (n.id || "").toLowerCase().replace(/^flowchart-/, "").split("-")[0];
        return Boolean(nid && id.includes(nid));
      });
      if (hit) edge.style.opacity = String(WALK.edgeFull);
    }
  }
}

function syncMinimap(minimap: HTMLElement | null, steps: WalkthroughStep[], stepIndex: number) {
  if (!minimap) return;
  const nodes = collectOpacityTargets(minimap);
  const step = steps[stepIndex];
  if (!step) return;
  const bright = findHighlightElements(minimap, step);
  const focus = bright[0] || pickFocusNode(minimap, step, stepIndex, steps.length);

  for (const node of nodes) {
    const on = focus ? node === focus || bright.includes(node) : false;
    node.classList.toggle("is-walk-active", on);
    node.style.opacity = String(on ? 1 : 0.35);
  }
}

function setCaption(
  els: {
    index: HTMLElement | null;
    title: HTMLElement | null;
    body: HTMLElement | null;
  },
  step: WalkthroughStep,
  stepIndex: number,
  total: number,
) {
  if (els.index) {
    els.index.textContent = `${String(stepIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  }
  if (els.title) els.title.textContent = step.title;
  if (els.body) els.body.textContent = step.body;
}

function mountSvg(host: HTMLElement, markup: string, extraClass?: string) {
  host.innerHTML = markup;
  const svg = host.querySelector("svg");
  if (!svg) return null;
  svg.classList.add("project-diagram-svg");
  if (extraClass) svg.classList.add(extraClass);
  return svg;
}

type WalkApi = {
  goTo: (index: number, animate?: boolean) => void;
};

export function ProjectDiagram({ title, diagram }: ProjectDiagramProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const overlayMountRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const indexRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const walkApiRef = useRef<WalkApi | null>(null);
  const mountedRef = useRef(true);
  const stepsRef = useRef<WalkthroughStep[]>([]);
  const stepIndexRef = useRef(0);
  const [steps, setSteps] = useState<WalkthroughStep[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const reactId = useId();
  const headingId = `project-diagram-heading-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    mountedRef.current = true;
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const camera = cameraRef.current;
    if (!section || !viewport || !camera) return;

    let ctx: { revert: () => void } | null = null;
    let mm: MatchMediaHandle | null = null;
    let cancelled = false;

    async function mount() {
      const baseSvg = buildBaseDiagramSvg(title);
      let svgMarkup = baseSvg;

      if (diagram.source === "github" && diagram.mermaid) {
        const rendered = await renderMermaidToSvg(
          diagram.mermaid,
          title.replace(/\W+/g, "-").toLowerCase(),
        );
        if (rendered) svgMarkup = rendered;
      }

      if (cancelled || !mountedRef.current || !camera) return;

      const mainSvg = mountSvg(camera, svgMarkup);
      if (mainSvg) {
        mainSvg.setAttribute("role", "img");
        if (!mainSvg.getAttribute("aria-label")) {
          mainSvg.setAttribute("aria-label", `How ${title} works`);
        }
      }

      if (minimapRef.current) {
        const mini = mountSvg(minimapRef.current, svgMarkup, "project-diagram-svg--minimap");
        mini?.setAttribute("aria-hidden", "true");
      }

      if (overlayMountRef.current) {
        mountSvg(overlayMountRef.current, svgMarkup, "project-diagram-svg--overlay");
      }

      const authored = normalizeAuthoredSteps(diagram.walkthrough);
      const resolved = resolveWalkthroughSteps({
        authored,
        mermaid: diagram.mermaid,
        svgRoot: camera,
      });
      stepsRef.current = resolved;
      setSteps(resolved);
      stepIndexRef.current = 0;
      setActiveIndex(0);

      const nodes = collectOpacityTargets(camera);
      const edges = collectEdges(camera);
      const captionEls = {
        index: indexRef.current,
        title: titleRef.current,
        body: bodyRef.current,
      };

      const paintChrome = (index: number) => {
        const list = stepsRef.current;
        const clamped = Math.max(0, Math.min(list.length - 1, index));
        stepIndexRef.current = clamped;
        setActiveIndex(clamped);
        const step = list[clamped];
        if (step) setCaption(captionEls, step, clamped, list.length);
        applySpotlight(camera, nodes, edges, list, clamped);
        syncMinimap(minimapRef.current, list, clamped);
        const dots = dotsRef.current?.querySelectorAll<HTMLElement>("[data-walk-dot]");
        dots?.forEach((dot, i) => {
          dot.classList.toggle("is-active", i === clamped);
          if (i === clamped) dot.setAttribute("aria-current", "step");
          else dot.removeAttribute("aria-current");
        });
      };

      if (prefersReducedMotion()) {
        paintChrome(0);
        camera.style.transform = "";
        for (const node of nodes) node.style.opacity = "1";
        for (const edge of edges) edge.style.opacity = "1";
        return;
      }

      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled || !mountedRef.current || !section || !viewport) return;

      const gsap = gsapMod.default;
      const { ScrollTrigger } = stMod;
      gsap.registerPlugin(ScrollTrigger);

      let poses = buildPoses(viewport, camera, resolved, gsap);

      const applyPose = (index: number) => {
        const pose = poses[index] ?? { x: 0, y: 0, scale: 1 };
        gsap.set(camera, {
          x: pose.x,
          y: pose.y,
          scale: pose.scale,
          transformOrigin: "0 0",
        });
      };

      const paintStep = (index: number) => {
        paintChrome(index);
        applyPose(index);
      };

      walkApiRef.current = {
        goTo: (index: number, animate = true) => {
          const list = stepsRef.current;
          const clamped = Math.max(0, Math.min(list.length - 1, index));
          const panel = section.querySelector<HTMLElement>("[data-diagram-panel]");
          if (!animate || !panel) {
            paintStep(clamped);
            return;
          }
          gsap.to(panel, {
            autoAlpha: 0.75,
            duration: MOTION.fast,
            ease: MOTION.ease,
            onComplete: () => {
              paintStep(clamped);
              gsap.to(panel, { autoAlpha: 1, duration: MOTION.fast, ease: MOTION.ease });
            },
          });
        },
      };

      ctx = gsap.context(() => {
        mm = gsap.matchMedia();
        const panel = section.querySelector<HTMLElement>("[data-diagram-panel]");
        const chrome = section.querySelector<HTMLElement>("[data-diagram-chrome]");

        mm.add("(prefers-reduced-motion: reduce)", () => {
          paintChrome(0);
          gsap.set(camera, { clearProps: "transform" });
          for (const node of nodes) node.style.opacity = "1";
          for (const edge of edges) edge.style.opacity = "1";
        });

        mm.add(
          "(prefers-reduced-motion: no-preference) and ((max-width: 1023px) or (pointer: coarse))",
          () => {
            gsap.set(camera, { clearProps: "transform" });
            paintChrome(0);
            if (panel) {
              gsap.set(panel, { y: 6, boxShadow: WALK.depthRestShadow });
              gsap.to(panel, {
                y: 0,
                boxShadow: WALK.depthLiftShadow,
                duration: MOTION.medium,
                ease: MOTION.ease,
                scrollTrigger: {
                  trigger: section,
                  start: "top 80%",
                  toggleActions: "play reverse play reverse",
                  refreshPriority: 3,
                },
              });
            }
            if (chrome) {
              gsap.fromTo(
                chrome,
                { autoAlpha: WALK.chromeRestOpacity },
                {
                  autoAlpha: WALK.chromeFullOpacity,
                  duration: MOTION.fast,
                  ease: MOTION.ease,
                  scrollTrigger: {
                    trigger: section,
                    start: "top 80%",
                    toggleActions: "play reverse play reverse",
                    refreshPriority: 3,
                  },
                },
              );
            }
          },
        );

        mm.add(
          "(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (pointer: fine)",
          () => {
            poses = buildPoses(viewport, camera, stepsRef.current, gsap);
            const n = Math.max(stepsRef.current.length, 1);

            paintStep(0);

            if (panel) {
              gsap.set(panel, {
                y: WALK.depthRestY,
                boxShadow: WALK.depthRestShadow,
              });
            }
            if (chrome) gsap.set(chrome, { autoAlpha: WALK.chromeRestOpacity });

            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: WALK.pinStart,
                end: `+=${WALK.pinVh * 100}%`,
                pin: true,
                pinSpacing: true,
                scrub: WALK.scrub,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                refreshPriority: 3,
                ...(n > 1
                  ? {
                      snap: {
                        snapTo: (value: number) => Math.round(value * (n - 1)) / (n - 1),
                        duration: { min: 0.12, max: WALK.snapDuration },
                        ease: MOTION.easeInOut,
                      },
                    }
                  : {}),
                onUpdate: (self) => {
                  const idx = n <= 1 ? 0 : Math.round(self.progress * (n - 1));
                  if (idx !== stepIndexRef.current) {
                    paintStep(idx);
                  }
                },
                onRefresh: () => {
                  poses = buildPoses(viewport, camera, stepsRef.current, gsap);
                  paintStep(stepIndexRef.current);
                },
              },
            });

            if (panel) {
              tl.to(
                panel,
                {
                  y: WALK.depthLiftY,
                  boxShadow: WALK.depthLiftShadow,
                  duration: 0.2,
                },
                0,
              );
            }
            if (chrome) {
              tl.to(chrome, { autoAlpha: WALK.chromeFullOpacity, duration: 0.15 }, 0);
            }

            // Scrub length for step stops (UI updates via onUpdate)
            tl.to({}, { duration: 1 }, 0);
          },
        );
      }, section);

      ScrollTrigger.refresh();
    }

    void mount();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      walkApiRef.current = null;
      mm?.revert();
      ctx?.revert();
    };
  }, [title, diagram]);

  function handleStepButton(index: number) {
    walkApiRef.current?.goTo(index, true);
    if (!walkApiRef.current) {
      setActiveIndex(index);
      stepIndexRef.current = index;
    }
  }

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

  const displaySteps = steps;
  const current = displaySteps[activeIndex];

  return (
    <section
      ref={sectionRef}
      className="project-diagram-section"
      aria-labelledby={headingId}
      data-exhibit-act="diagram"
      data-walkthrough="1"
    >
      <div className="project-walk-header">
        <h2 id={headingId} className="project-exhibit-section-title">
          How it works
        </h2>
        <p className="project-diagram-source">
          {diagram.source === "github" && diagram.path
            ? `Path through architecture from ${diagram.path}`
            : "Generic system path — replace with repo architecture docs when available"}
        </p>
      </div>

      <div className="project-walk" data-walk-stage>
        <div className="project-walk-caption" aria-live="polite">
          <span ref={indexRef} className="project-walk-index">
            {current
              ? `${String(activeIndex + 1).padStart(2, "0")} / ${String(Math.max(displaySteps.length, 1)).padStart(2, "0")}`
              : "—"}
          </span>
          <h3 ref={titleRef} className="project-walk-title">
            {current?.title ?? ""}
          </h3>
          <p ref={bodyRef} className="project-walk-body">
            {current?.body ?? ""}
          </p>
        </div>

        <div ref={viewportRef} className="project-diagram project-walk-stage" data-diagram-panel>
          <div className="project-diagram-chrome" data-diagram-chrome aria-hidden="true">
            <span className="project-diagram-chrome-dot" />
            <span className="project-diagram-chrome-dot" />
            <span className="project-diagram-chrome-dot" />
            <span className="project-diagram-chrome-bar" />
          </div>
          <div ref={cameraRef} className="project-diagram-camera" />
        </div>

        <div className="project-walk-aside">
          <div
            ref={minimapRef}
            className="project-walk-minimap"
            aria-hidden="true"
            data-walk-minimap
          />

          <div
            ref={dotsRef}
            className="project-walk-dots"
            role="tablist"
            aria-label="Architecture steps"
          >
            {displaySteps.map((step, i) => (
              <button
                key={step.id}
                type="button"
                className={`project-walk-dot${i === activeIndex ? " is-active" : ""}`}
                data-walk-dot
                role="tab"
                aria-label={`Step ${i + 1}: ${step.title}`}
                onClick={() => handleStepButton(i)}
              />
            ))}
          </div>

          <div className="project-walk-switcher" data-walk-switcher>
            <button
              type="button"
              className="project-walk-nav"
              aria-label="Previous step"
              disabled={activeIndex <= 0 || displaySteps.length === 0}
              onClick={() => handleStepButton(activeIndex - 1)}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="project-walk-nav"
              aria-label="Next step"
              disabled={activeIndex >= displaySteps.length - 1 || displaySteps.length === 0}
              onClick={() => handleStepButton(activeIndex + 1)}
            >
              Next →
            </button>
          </div>

          <button type="button" className="project-walk-full" onClick={openOverlay}>
            View full architecture
          </button>
        </div>
      </div>

      <ol className="project-walk-list" data-walk-list>
        {displaySteps.map((step, i) => (
          <li key={step.id} className={i === activeIndex ? "is-active" : undefined}>
            <span className="project-walk-list-index">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="project-walk-list-title">{step.title}</p>
              <p className="project-walk-list-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

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
        <div ref={overlayMountRef} className="project-walk-overlay-body" />
      </dialog>
    </section>
  );
}
