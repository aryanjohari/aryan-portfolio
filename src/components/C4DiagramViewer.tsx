"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  MermaidDiagram,
  type MermaidZoomActivator,
} from "@/components/MermaidDiagram";

type C4DiagramViewerProps = {
  source: string;
  ariaLabel: string;
  levelLabel: "Context" | "Containers" | "Components";
  activators?: MermaidZoomActivator[];
  onActivate?: (id: string) => void;
  fallbackHref?: string;
  allowFullscreen?: boolean;
};

type C4Kind =
  | "person"
  | "system"
  | "external"
  | "container"
  | "database"
  | "component";

type ViewState = {
  x: number;
  y: number;
  scale: number;
  zoom: number;
};

type DiagramBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.25;

const KIND_LABELS: Record<C4Kind, string> = {
  person: "Person",
  system: "Software system",
  external: "External system",
  container: "Application / container",
  database: "Database / store",
  component: "Component",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function kindsInSource(source: string): C4Kind[] {
  const kinds = new Set<C4Kind>();
  const declaration =
    /^\s*(Person(?:_Ext)?|System(?:Db|Queue)?(?:_Ext)?|Container(?:Db|Queue)?(?:_Ext)?|Component(?:Db|Queue)?(?:_Ext)?)\s*\(/gm;

  for (const match of source.matchAll(declaration)) {
    const type = match[1];
    if (type.startsWith("Person")) kinds.add("person");
    else if (type.includes("Db")) kinds.add("database");
    else if (type.endsWith("_Ext")) kinds.add("external");
    else if (type.startsWith("System")) kinds.add("system");
    else if (type.startsWith("Container")) kinds.add("container");
    else if (type.startsWith("Component")) kinds.add("component");
  }

  return [...kinds];
}

function movableSvgChildren(svg: SVGSVGElement): ChildNode[] {
  return Array.from(svg.childNodes).filter((node) => {
    const name = node.nodeName.toLowerCase();
    return name !== "style" && name !== "defs" && name !== "title" && name !== "desc";
  });
}

function directSvgChildren<T extends SVGElement>(group: SVGGElement, tagName: string): T[] {
  return Array.from(group.children).filter(
    (child): child is T => child.tagName.toLowerCase() === tagName,
  );
}

function kindFromStereotype(value: string): C4Kind | null {
  const stereotype = value.toLowerCase().replace(/[<>\s]/g, "");
  if (stereotype === "person" || stereotype === "external_person") return "person";
  if (stereotype.includes("_db") || stereotype.includes("database")) return "database";
  if (stereotype.includes("external")) return "external";
  if (stereotype.startsWith("container")) return "container";
  if (stereotype.startsWith("component")) return "component";
  if (stereotype.startsWith("system")) return "system";
  return null;
}

function glyphMarkup(kind: C4Kind): string {
  switch (kind) {
    case "person":
      return '<circle cx="8" cy="4" r="2.5"/><path d="M2.5 15c0-4 2.2-6.5 5.5-6.5s5.5 2.5 5.5 6.5"/>';
    case "database":
      return '<ellipse cx="8" cy="3.5" rx="6" ry="2.5"/><path d="M2 3.5v8.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V3.5M2 8c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"/>';
    case "container":
      return '<rect x="1.5" y="2" width="13" height="12" rx="1"/><path d="M1.5 5.5h13"/><circle cx="4" cy="3.8" r=".55"/><circle cx="6" cy="3.8" r=".55"/>';
    case "component":
      return '<rect x="3" y="2" width="10" height="12"/><path d="M1 5h4M1 9h4M11 5h4M11 9h4"/>';
    case "external":
      return '<path d="M3 1.5h11v11M14 1.5 7.5 8"/><path d="M12 8v6H2V4h6"/>';
    case "system":
      return '<rect x="1.5" y="2" width="13" height="12" rx="1"/><path d="M5 2v12M1.5 6h3.5"/>';
  }
}

function appendKindGlyph(group: SVGGElement, kind: C4Kind) {
  const existingImage = directSvgChildren<SVGImageElement>(group, "image")[0];
  const rect = directSvgChildren<SVGRectElement>(group, "rect")[0];
  if (!rect) return;

  const glyph = document.createElementNS(SVG_NS, "g");
  glyph.setAttribute("class", "c4-node-glyph");
  glyph.setAttribute("data-kind", kind);
  glyph.setAttribute("aria-hidden", "true");

  if (existingImage) {
    const imageX = Number(existingImage.getAttribute("x") ?? 0);
    const imageY = Number(existingImage.getAttribute("y") ?? 0);
    glyph.setAttribute("transform", `translate(${imageX + 16} ${imageY + 14}) scale(1.25)`);
    existingImage.remove();
  } else {
    const x = Number(rect.getAttribute("x") ?? 0);
    const y = Number(rect.getAttribute("y") ?? 0);
    glyph.setAttribute("transform", `translate(${x + 12} ${y + 12})`);
  }

  glyph.innerHTML = glyphMarkup(kind);
  group.appendChild(glyph);
}

function wrapRelationshipLabel(text: SVGTextElement, maxWidth: number) {
  const value = (text.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!value || text.getComputedTextLength() <= maxWidth) return;

  const words = value.split(" ");
  if (words.length < 2) return;

  let splitAt = 1;
  let bestBalance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const before = words.slice(0, index).join(" ").length;
    const after = words.slice(index).join(" ").length;
    const balance = Math.abs(before - after);
    if (balance < bestBalance) {
      splitAt = index;
      bestBalance = balance;
    }
  }

  const x = text.getAttribute("x") ?? "0";
  text.textContent = "";
  const firstLine = document.createElementNS(SVG_NS, "tspan");
  firstLine.setAttribute("x", x);
  firstLine.setAttribute("dy", "-0.55em");
  firstLine.textContent = words.slice(0, splitAt).join(" ");
  const secondLine = document.createElementNS(SVG_NS, "tspan");
  secondLine.setAttribute("x", x);
  secondLine.setAttribute("dy", "1.1em");
  secondLine.textContent = words.slice(splitAt).join(" ");
  text.append(firstLine, secondLine);
}

function boxesIntersect(a: DiagramBounds, b: DiagramBounds, padding = 0): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function positionRelationshipLabels(
  texts: SVGTextElement[],
  nodeBounds: DiagramBounds[],
  occupied: DiagramBounds[],
) {
  const clusters: SVGTextElement[][] = [];
  for (const text of texts) {
    const x = Number(text.getAttribute("x") ?? 0);
    const y = Number(text.getAttribute("y") ?? 0);
    const previous = clusters.at(-1);
    const previousText = previous?.at(-1);
    const previousX = Number(previousText?.getAttribute("x") ?? Number.NaN);
    const previousY = Number(previousText?.getAttribute("y") ?? Number.NaN);
    if (previous && Math.abs(x - previousX) < 1 && Math.abs(y - previousY) <= 32) {
      previous.push(text);
    } else {
      clusters.push([text]);
    }
  }

  const candidates = [
    { x: 0, y: 0 },
    { x: 0, y: -28 },
    { x: 0, y: 28 },
    { x: -44, y: 0 },
    { x: 44, y: 0 },
    { x: 0, y: -54 },
    { x: 0, y: 54 },
    { x: -76, y: -28 },
    { x: 76, y: -28 },
    { x: -76, y: 28 },
    { x: 76, y: 28 },
    { x: -160, y: 0 },
    { x: 160, y: 0 },
  ];

  for (const cluster of clusters) {
    const boxes = cluster.map((text) => text.getBBox());
    const base = boxes.reduce<DiagramBounds>(
      (bounds, box) => ({
        x: Math.min(bounds.x, box.x),
        y: Math.min(bounds.y, box.y),
        width: Math.max(bounds.x + bounds.width, box.x + box.width) - Math.min(bounds.x, box.x),
        height:
          Math.max(bounds.y + bounds.height, box.y + box.height) - Math.min(bounds.y, box.y),
      }),
      { x: boxes[0].x, y: boxes[0].y, width: boxes[0].width, height: boxes[0].height },
    );
    const offset =
      candidates.find((candidate) => {
        const moved = { ...base, x: base.x + candidate.x, y: base.y + candidate.y };
        return (
          !nodeBounds.some((node) => boxesIntersect(moved, node, 8)) &&
          !occupied.some((label) => boxesIntersect(moved, label, 6))
        );
      }) ?? candidates[0];

    for (const text of cluster) {
      if (offset.x || offset.y) {
        text.setAttribute("transform", `translate(${offset.x} ${offset.y})`);
      }
    }
    occupied.push({ ...base, x: base.x + offset.x, y: base.y + offset.y });
  }
}

function decorateC4Svg(svg: SVGSVGElement, panLayer: SVGGElement) {
  const nodeGroups = panLayer.querySelectorAll<SVGGElement>("g.person-man");
  for (const group of nodeGroups) {
    const texts = directSvgChildren<SVGTextElement>(group, "text");
    const kind = kindFromStereotype(texts[0]?.textContent ?? "");
    if (!kind) continue;
    group.dataset.c4Kind = kind;
    texts.forEach((text, index) => {
      const value = (text.textContent ?? "").trim();
      const weight = text.style.fontWeight || text.getAttribute("font-weight") || "";
      if (index === 0) text.classList.add("c4-node-stereotype");
      else if (/^\[.*\]$/.test(value)) text.classList.add("c4-node-technology");
      else if (weight === "bold" || Number.parseInt(weight, 10) >= 600) {
        text.classList.add("c4-node-title");
      } else {
        text.classList.add("c4-node-description");
      }
    });
    appendKindGlyph(group, kind);
  }

  const edgeLayer = document.createElementNS(SVG_NS, "g");
  edgeLayer.setAttribute("class", "c4-relationship-edges");
  const nodeBounds = Array.from(nodeGroups).flatMap((group) => {
    const rect = directSvgChildren<SVGRectElement>(group, "rect")[0];
    if (!rect) return [];
    return [
      {
        x: Number(rect.getAttribute("x") ?? 0),
        y: Number(rect.getAttribute("y") ?? 0),
        width: Number(rect.getAttribute("width") ?? 0),
        height: Number(rect.getAttribute("height") ?? 0),
      },
    ];
  });
  const occupiedLabelBounds: DiagramBounds[] = [];
  for (const group of panLayer.querySelectorAll<SVGGElement>("g:not(.person-man)")) {
    const directRects = directSvgChildren<SVGRectElement>(group, "rect");
    const directTexts = directSvgChildren<SVGTextElement>(group, "text");
    const directEdges = Array.from(group.children).filter((child) => {
      const tag = child.tagName.toLowerCase();
      return tag === "line" || tag === "path";
    });
    if (directRects.length > 0 && directTexts.some((text) => /\[(?:SYSTEM|CONTAINER|ENTERPRISE)\]/i.test(text.textContent ?? ""))) {
      group.classList.add("c4-boundary");
      directTexts.forEach((text) => text.classList.add("c4-boundary-label"));
    } else if (directEdges.length > 0 && directTexts.length > 0) {
      group.classList.add("c4-relationships");
      directEdges.forEach((edge) => {
        edge.classList.add("c4-relationship-edge");
        edgeLayer.appendChild(edge);
      });
      directTexts.forEach((text) => {
        text.classList.add("c4-relationship-label");
        wrapRelationshipLabel(text, 280);
      });
      positionRelationshipLabels(directTexts, nodeBounds, occupiedLabelBounds);
    }
  }
  if (edgeLayer.childElementCount > 0) {
    panLayer.insertBefore(edgeLayer, panLayer.firstChild);
  }

  const diagramTitle = directSvgChildren<SVGTextElement>(panLayer, "text").at(-1);
  diagramTitle?.classList.add("c4-diagram-title");
  for (const marker of svg.querySelectorAll<SVGMarkerElement>("marker")) {
    if (!/arrowhead|filled-head/.test(marker.id)) continue;
    marker.setAttribute("markerWidth", "14");
    marker.setAttribute("markerHeight", "14");
    marker.setAttribute("orient", "auto");
    marker.classList.add("c4-arrow-marker");
  }
}

/**
 * Audited against Mermaid 11.16 C4Context/C4Container/C4Component output:
 * every semantic node is `g.person-man` (despite its type), with its actual
 * kind carried by the first `<<stereotype>>` text. Boundaries and relationship
 * groups have no stable class, so they are tagged from their direct children.
 * Generated `<style>`/`<defs>` stay at the root; only visual children are
 * wrapped so pan/zoom never competes with Mermaid's nested transforms.
 */
export function C4DiagramViewer({
  source,
  ariaLabel,
  levelLabel,
  activators,
  onActivate,
  fallbackHref,
  allowFullscreen = false,
}: C4DiagramViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panLayerRef = useRef<SVGGElement | null>(null);
  const boundsRef = useRef<DiagramBounds | null>(null);
  const fitScaleRef = useRef(1);
  const viewRef = useRef<ViewState>({ x: 0, y: 0, scale: 1, zoom: 1 });
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(
    null,
  );
  const draggedRef = useRef(false);
  const fullscreenCloseRef = useRef<HTMLButtonElement>(null);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const legendKinds = useMemo(() => kindsInSource(source), [source]);

  const applyView = useCallback((next: ViewState) => {
    viewRef.current = next;
    panLayerRef.current?.setAttribute(
      "transform",
      `translate(${next.x} ${next.y}) scale(${next.scale})`,
    );
    setZoom(next.zoom);
  }, []);

  const fitToView = useCallback(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const bounds = boundsRef.current;
    if (!stage || !svg || !bounds || bounds.width <= 0 || bounds.height <= 0) return;

    const width = Math.max(stage.clientWidth, 1);
    const padding = width < 640 ? 14 : 28;
    if (!rootRef.current?.classList.contains("is-expanded")) {
      const minHeight = width < 640 ? 352 : 420;
      const maxHeight =
        width < 640
          ? levelLabel === "Components"
            ? 1500
            : 1200
          : levelLabel === "Components"
            ? 1800
            : 1500;
      const widthFitScale = Math.max((width - padding * 2) / bounds.width, 0.01);
      const naturalHeight = bounds.height * widthFitScale + padding * 2;
      stage.style.setProperty(
        "--c4-stage-height",
        `${Math.round(clamp(naturalHeight, minHeight, maxHeight))}px`,
      );
    }
    const height = Math.max(stage.clientHeight, 1);
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
    );
    const fittedScale = Math.max(scale, 0.01);
    const x = (width - bounds.width * fittedScale) / 2 - bounds.x * fittedScale;
    const y = (height - bounds.height * fittedScale) / 2 - bounds.y * fittedScale;

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    fitScaleRef.current = fittedScale;
    applyView({ x, y, scale: fittedScale, zoom: 1 });
  }, [applyView, levelLabel]);

  const handleRender = useCallback(
    (svg: SVGSVGElement) => {
      const visualChildren = movableSvgChildren(svg);
      const panLayer = document.createElementNS(SVG_NS, "g");
      panLayer.setAttribute("class", "c4-viewer-pan-layer");
      const firstVisualChild = visualChildren[0] ?? null;
      svg.insertBefore(panLayer, firstVisualChild);
      for (const child of visualChildren) panLayer.appendChild(child);

      svg.classList.add("c4-viewer-svg");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svgRef.current = svg;
      panLayerRef.current = panLayer;
      decorateC4Svg(svg, panLayer);

      const box = panLayer.getBBox();
      boundsRef.current = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
      setReady(true);
      window.requestAnimationFrame(() => window.requestAnimationFrame(fitToView));
    },
    [fitToView],
  );

  const zoomAt = useCallback(
    (nextZoom: number, anchor?: { x: number; y: number }) => {
      const stage = stageRef.current;
      if (!stage || !panLayerRef.current) return;
      const current = viewRef.current;
      const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const nextScale = fitScaleRef.current * clampedZoom;
      const point = anchor ?? {
        x: stage.clientWidth / 2,
        y: stage.clientHeight / 2,
      };
      const ratio = nextScale / current.scale;

      applyView({
        x: point.x - (point.x - current.x) * ratio,
        y: point.y - (point.y - current.y) * ratio,
        scale: nextScale,
        zoom: clampedZoom,
      });
    },
    [applyView],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ready) return;
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(fitToView);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fitToView, ready]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    fullscreenCloseRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [expanded]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !panLayerRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    pointerRef.current = { id: event.pointerId, ...point };
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      };
      pointerRef.current = null;
    }
    draggedRef.current = false;
    event.currentTarget.dataset.panning = "true";
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.max(Math.hypot(second.x - first.x, second.y - first.y), 1);
      const rect = event.currentTarget.getBoundingClientRect();
      const center = {
        x: (first.x + second.x) / 2 - rect.left,
        y: (first.y + second.y) / 2 - rect.top,
      };
      const previous = pinchRef.current;
      const previousCenter = {
        x: previous.center.x - rect.left,
        y: previous.center.y - rect.top,
      };
      const current = viewRef.current;
      const nextZoom = clamp(
        current.zoom * (distance / Math.max(previous.distance, 1)),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const nextScale = fitScaleRef.current * nextZoom;
      const ratio = nextScale / current.scale;
      applyView({
        x: center.x - (previousCenter.x - current.x) * ratio,
        y: center.y - (previousCenter.y - current.y) * ratio,
        scale: nextScale,
        zoom: nextZoom,
      });
      pinchRef.current = {
        distance,
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      };
      draggedRef.current = true;
      return;
    }
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) draggedRef.current = true;
    pointerRef.current = { id: pointer.id, x: event.clientX, y: event.clientY };
    const current = viewRef.current;
    applyView({ ...current, x: current.x + dx, y: current.y + dy });
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()][0];
    pointerRef.current = remaining
      ? { id: remaining[0], x: remaining[1].x, y: remaining[1].y }
      : null;
    pinchRef.current = null;
    if (pointersRef.current.size === 0) delete event.currentTarget.dataset.panning;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    zoomAt(viewRef.current.zoom * factor, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = viewRef.current;
    const panBy = event.shiftKey ? 80 : 36;
    if (event.key === "+" || event.key === "=") zoomAt(current.zoom * ZOOM_FACTOR);
    else if (event.key === "-") zoomAt(current.zoom / ZOOM_FACTOR);
    else if (event.key === "0" || event.key.toLowerCase() === "f") fitToView();
    else if (event.key === "ArrowLeft") applyView({ ...current, x: current.x + panBy });
    else if (event.key === "ArrowRight") applyView({ ...current, x: current.x - panBy });
    else if (event.key === "ArrowUp") applyView({ ...current, y: current.y + panBy });
    else if (event.key === "ArrowDown") applyView({ ...current, y: current.y - panBy });
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className={`c4-viewer${expanded ? " is-expanded" : ""}`}
      data-c4-level={levelLabel.toLowerCase()}
      data-void-scroll-exempt
      role={expanded ? "dialog" : "group"}
      aria-modal={expanded ? "true" : undefined}
      aria-label={expanded ? `${levelLabel} diagram full screen` : `${levelLabel} diagram viewer`}
    >
      <div className="c4-viewer-toolbar">
        <span className="c4-viewer-level">{levelLabel}</span>
        <div className="c4-viewer-controls" role="group" aria-label="Diagram view controls">
          <button
            type="button"
            className="c4-viewer-control"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => zoomAt(viewRef.current.zoom / ZOOM_FACTOR)}
          >
            −
          </button>
          <button
            type="button"
            className="c4-viewer-control c4-viewer-fit"
            aria-label="Fit diagram to view"
            onClick={fitToView}
          >
            Fit
          </button>
          <button
            type="button"
            className="c4-viewer-control"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => zoomAt(viewRef.current.zoom * ZOOM_FACTOR)}
          >
            +
          </button>
          <output className="c4-viewer-zoom" aria-live="polite">
            {Math.round(zoom * 100)}%
          </output>
          {allowFullscreen ? (
            <button
              ref={fullscreenCloseRef}
              type="button"
              className="c4-viewer-control c4-viewer-fullscreen"
              aria-label={expanded ? "Close full screen diagram" : "Open full screen diagram"}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Close" : "Full screen"}
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={stageRef}
        className="c4-viewer-stage"
        role="group"
        tabIndex={0}
        aria-label={`${ariaLabel}. Drag to pan. Use plus and minus to zoom, or F to fit.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onClickCapture={(event) => {
          if (!draggedRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          draggedRef.current = false;
        }}
      >
        <MermaidDiagram
          source={source}
          ariaLabel={ariaLabel}
          activators={activators}
          onActivate={onActivate}
          fallbackHref={fallbackHref}
          onRender={handleRender}
        />
      </div>

      {legendKinds.length > 0 ? (
        <ul className="c4-viewer-legend" aria-label="Diagram symbol legend">
          {legendKinds.map((kind) => (
            <li key={kind}>
              <span className="c4-viewer-legend-glyph" data-kind={kind} aria-hidden="true" />
              {KIND_LABELS[kind]}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
