"use client";

import { useEffect, useRef } from "react";

import { buildBaseDiagramSvg } from "@/data/base-diagram";
import type { ProjectDiagramData } from "@/lib/projects";
import { prefersReducedMotion } from "@/lib/motion";

type ProjectDiagramProps = {
  title: string;
  diagram: ProjectDiagramData;
};

function prepareStrokeDraw(root: HTMLElement): SVGGeometryElement[] {
  const edges = Array.from(
    root.querySelectorAll<SVGGeometryElement>(
      "[data-diagram-edge], path, line, polyline, polygon, circle, ellipse, rect",
    ),
  ).filter((el) => {
    if (el.closest("defs") || el.closest("marker")) return false;
    const tag = el.tagName.toLowerCase();
    // Prefer explicit edges; otherwise animate stroked shapes from mermaid SVGs
    if (el.hasAttribute("data-diagram-edge")) return true;
    if (tag === "path" || tag === "line" || tag === "polyline") {
      const stroke = el.getAttribute("stroke");
      return stroke !== null && stroke !== "none";
    }
    return false;
  });

  for (const el of edges) {
    try {
      const length = el.getTotalLength();
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length}`;
    } catch {
      // Some geometry types may not support getTotalLength in every browser
    }
  }

  return edges;
}

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

export function ProjectDiagram({ title, diagram }: ProjectDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    async function mount() {
      const baseSvg = buildBaseDiagramSvg(title);
      let svgMarkup = baseSvg;

      if (diagram.source === "github" && diagram.mermaid) {
        const rendered = await renderMermaidToSvg(diagram.mermaid, title.replace(/\W+/g, "-").toLowerCase());
        if (rendered) {
          svgMarkup = rendered;
        }
      }

      if (cancelled || !mountedRef.current || !container) return;

      container.innerHTML = svgMarkup;
      const svgRoot = container.querySelector("svg");
      if (svgRoot) {
        svgRoot.classList.add("project-diagram-svg");
        svgRoot.setAttribute("role", "img");
        if (!svgRoot.getAttribute("aria-label")) {
          svgRoot.setAttribute("aria-label", `How ${title} works`);
        }
      }

      const reduce = prefersReducedMotion();
      const nodes = Array.from(container.querySelectorAll<SVGElement>("[data-diagram-node], .node, .cluster, text, .label"));
      const edges = prepareStrokeDraw(container);

      if (reduce) {
        for (const el of edges) {
          el.style.strokeDashoffset = "0";
        }
        for (const node of nodes) {
          node.style.opacity = "1";
        }
        return;
      }

      for (const node of nodes) {
        node.style.opacity = "0";
      }

      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled || !mountedRef.current) return;

      const gsap = gsapMod.default;
      const { ScrollTrigger } = stMod;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: "top 80%",
            once: true,
          },
        });

        if (edges.length > 0) {
          tl.to(edges, {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: "power2.out",
            stagger: 0.08,
          });
        }

        if (nodes.length > 0) {
          tl.to(
            nodes,
            {
              opacity: 1,
              duration: 0.45,
              ease: "power1.out",
              stagger: 0.04,
            },
            edges.length > 0 ? "-=0.55" : 0,
          );
        }
      }, container);
    }

    void mount();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      ctx?.revert();
    };
  }, [title, diagram]);

  return (
    <section className="project-diagram-section" aria-labelledby="project-diagram-heading">
      <h2 id="project-diagram-heading" className="project-exhibit-section-title">
        How it works
      </h2>
      <p className="project-diagram-source">
        {diagram.source === "github" && diagram.path
          ? `Architecture from ${diagram.path}`
          : "Generic system flow — replace with repo architecture docs when available"}
      </p>
      <div ref={containerRef} className="project-diagram" />
    </section>
  );
}
