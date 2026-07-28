"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ArchitectureJourney } from "@/components/ArchitectureJourney";
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
  slug?: string;
};

type MatchMediaHandle = {
  add: (query: string, handler: () => void) => unknown;
  revert: () => void;
};

/**
 * Base-diagram walk tunables (Input→Core→Output fallback only).
 * Owned IR uses ArchitectureJourney overview + optional dive.
 */
const WALK = {
  nodeDim: 0.12,
  nodeFull: 1,
  edgeDim: 0.08,
  edgeFull: 0.92,
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

function mountSvg(host: HTMLElement, markup: string, extraClass?: string) {
  host.innerHTML = markup;
  const svg = host.querySelector("svg");
  if (!svg) return null;
  svg.classList.add("project-diagram-svg");
  if (extraClass) svg.classList.add(extraClass);
  return svg;
}

function applyLegacySpotlight(
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

function sourceCopy(diagram: ProjectDiagramData): string {
  if (diagram.graph) {
    if (diagram.graphSource === "github" && diagram.graphPath) {
      return `Owned architecture map from ${diagram.graphPath}`;
    }
    if (diagram.graphPath) {
      return `Owned architecture map (${diagram.graphPath})`;
    }
    return "Owned architecture map";
  }
  if (diagram.source === "github" && diagram.path) {
    return `Generic system path — full Mermaid available via “View full architecture” (${diagram.path})`;
  }
  return "Generic system path — replace with repo architecture graph when available";
}

type WalkApi = {
  goTo: (index: number, animate?: boolean) => void;
};

/**
 * Fallback order for the main stage:
 * 1. Owned IR (`diagram.graph`) → ArchitectureJourney (overview + optional dive)
 * 2. Base Input→Core→Output SVG with stepped captions
 * Mermaid is escape-hatch only (overlay), not the default view.
 */
export function ProjectDiagram({ title, diagram, slug }: ProjectDiagramProps) {
  const ownedGraph = diagram.graph;
  if (ownedGraph) {
    return (
      <ArchitectureJourney
        title={title}
        graph={ownedGraph}
        sourceNote={sourceCopy(diagram)}
        slug={slug}
      />
    );
  }

  return <BaseDiagramFallback title={title} diagram={diagram} />;
}

function BaseDiagramFallback({ title, diagram }: ProjectDiagramProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
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

    const stage = camera;

    let ctx: { revert: () => void } | null = null;
    let mm: MatchMediaHandle | null = null;
    let cancelled = false;

    async function mount() {
      const authored = normalizeAuthoredSteps(diagram.walkthrough);
      const baseSvg = buildBaseDiagramSvg(title);
      mountSvg(stage, baseSvg);

      if (overlayMountRef.current) {
        let overlayMarkup = baseSvg;
        if (diagram.mermaid) {
          const rendered = await renderMermaidToSvg(
            diagram.mermaid,
            title.replace(/\W+/g, "-").toLowerCase(),
          );
          if (rendered) overlayMarkup = rendered;
        }
        if (cancelled || !mountedRef.current) return;
        mountSvg(overlayMountRef.current, overlayMarkup, "project-diagram-svg--overlay");
      }

      if (cancelled || !mountedRef.current) return;

      const resolved = resolveWalkthroughSteps({
        authored,
        mermaid: undefined,
        svgRoot: stage,
      });
      stepsRef.current = resolved;
      setSteps(resolved);
      stepIndexRef.current = 0;
      setActiveIndex(0);

      const captionEls = {
        index: indexRef.current,
        title: titleRef.current,
        body: bodyRef.current,
      };

      const legacyNodes = collectOpacityTargets(stage);
      const legacyEdges = collectEdges(stage);

      const paintCaption = (index: number) => {
        const list = stepsRef.current;
        const clamped = Math.max(0, Math.min(list.length - 1, index));
        stepIndexRef.current = clamped;
        setActiveIndex(clamped);
        const step = list[clamped];
        if (step) setCaption(captionEls, step, clamped, list.length);

        const dots = dotsRef.current?.querySelectorAll<HTMLElement>("[data-walk-dot]");
        dots?.forEach((dot, i) => {
          dot.classList.toggle("is-active", i === clamped);
          if (i === clamped) dot.setAttribute("aria-current", "step");
          else dot.removeAttribute("aria-current");
        });
      };

      const paintChrome = (index: number) => {
        paintCaption(index);
        applyLegacySpotlight(stage, legacyNodes, legacyEdges, stepsRef.current, index);
      };

      if (prefersReducedMotion()) {
        paintChrome(0);
        return;
      }

      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled || !mountedRef.current || !section || !viewport) return;

      const gsap = gsapMod.default;
      const { ScrollTrigger } = stMod;
      gsap.registerPlugin(ScrollTrigger);

      walkApiRef.current = {
        goTo: (index: number, animate = true) => {
          const list = stepsRef.current;
          const clamped = Math.max(0, Math.min(list.length - 1, index));
          const panel = section.querySelector<HTMLElement>("[data-diagram-panel]");
          const paint = () => paintChrome(clamped);
          if (!animate || !panel) {
            paint();
            return;
          }
          gsap.to(panel, {
            autoAlpha: 0.85,
            duration: MOTION.fast,
            ease: MOTION.ease,
            onComplete: () => {
              paint();
              gsap.to(panel, { autoAlpha: 1, duration: MOTION.fast, ease: MOTION.ease });
            },
          });
        },
      };

      ctx = gsap.context(() => {
        mm = gsap.matchMedia();
        const stageInner = section.querySelector<HTMLElement>("[data-diagram-stage]");

        mm.add("(prefers-reduced-motion: reduce)", () => {
          paintChrome(0);
        });

        mm.add("(prefers-reduced-motion: no-preference)", () => {
          paintChrome(0);
          if (stageInner) {
            gsap.fromTo(
              stageInner,
              { y: 8, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: MOTION.medium,
                ease: MOTION.ease,
                scrollTrigger: {
                  trigger: section,
                  start: "top 80%",
                  toggleActions: "play none none none",
                  once: true,
                },
              },
            );
          }
        });
      }, section);

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
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
      data-diagram-mode="base"
    >
      <div className="project-walk-header">
        <h2 id={headingId} className="project-exhibit-section-title">
          How it works
        </h2>
        <p className="project-diagram-source">{sourceCopy(diagram)}</p>
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

        <div
          ref={viewportRef}
          className="project-diagram project-walk-stage"
          data-diagram-panel
        >
          <div className="project-diagram-chrome" data-diagram-chrome aria-hidden="true">
            <span className="project-diagram-chrome-dot" />
            <span className="project-diagram-chrome-dot" />
            <span className="project-diagram-chrome-dot" />
            <span className="project-diagram-chrome-bar" />
          </div>
          <div ref={cameraRef} className="project-diagram-camera" data-diagram-stage />
        </div>

        <div className="project-walk-aside">
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
