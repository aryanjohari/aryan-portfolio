"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type MermaidZoomActivator = {
  id: string;
  labels: string[];
  whisper?: string;
};

const SVG_NS = "http://www.w3.org/2000/svg";

type MermaidDiagramProps = {
  source: string;
  className?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  /** Receives the live SVG after Mermaid has rendered it into the host. */
  onRender?: (svg: SVGSVGElement) => void;
  /** Optional click targets matched against rendered SVG text. */
  activators?: MermaidZoomActivator[];
  onActivate?: (id: string) => void;
  /** GitHub doc URL shown when Mermaid fails to render. */
  fallbackHref?: string;
};

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function labelMatches(haystack: string, needle: string): boolean {
  const h = normalizeLabel(haystack);
  const n = normalizeLabel(needle);
  if (!h || !n) return false;
  if (h === n) return true;
  // Documented fallback for maps whose authored label includes a type suffix.
  // Avoid short substring matches such as "ada" or "hud".
  if (n.length < 5) return false;
  return h.startsWith(`${n} `) || h.endsWith(` ${n}`);
}

function wrapWords(value: string, characterLimit: number): string {
  if (value.length <= characterLimit || /<br\s*\/?>/i.test(value)) return value;
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > characterLimit) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.join("<br/>");
}

function sourceWithWrappedC4Copy(source: string, compact: boolean): string {
  const declaration =
    /^(\s*(?:Person(?:_Ext)?|System(?:Db|Queue)?(?:_Ext)?|Container(?:Db|Queue)?(?:_Ext)?|Component(?:Db|Queue)?(?:_Ext)?)\s*\()(.+)(\)\s*)$/gm;
  const limits = compact ? [21, 22, 22] : [24, 26, 26];

  return source.replace(declaration, (_line, start: string, argumentsText: string, end: string) => {
    let quotedIndex = 0;
    const wrappedArguments = argumentsText.replace(
      /"((?:\\.|[^"\\])*)"/g,
      (quoted: string, value: string) => {
        const limit = limits[Math.min(quotedIndex, limits.length - 1)];
        quotedIndex += 1;
        if (quotedIndex > 3 || /(?:https?:\/\/|data:)/i.test(value)) return quoted;
        return `"${wrapWords(value, limit)}"`;
      },
    );
    return `${start}${wrappedArguments}${end}`;
  });
}

function sourceWithResponsiveC4Layout(
  source: string,
  viewportWidth: number,
  compact: boolean,
): string {
  const shapeCount = (
    source.match(
      /^\s*(?:Person(?:_Ext)?|System(?:Db|Queue)?(?:_Ext)?|Container(?:Db|Queue)?(?:_Ext)?|Component(?:Db|Queue)?(?:_Ext)?)\s*\(/gm,
    ) ?? []
  ).length;
  const nodeWidth = compact ? 260 : 292;
  const nodeMargin = compact ? 24 : 32;
  const firstNodeWidth = nodeWidth + nodeMargin;
  const subsequentNodeWidth = nodeWidth + nodeMargin * 2;
  const columnsThatFit = Math.max(
    1,
    Math.floor((viewportWidth - firstNodeWidth) / subsequentNodeWidth) + 1,
  );
  const shapeColumns = Math.max(1, Math.min(shapeCount || 1, compact ? 2 : 5, columnsThatFit));
  const withoutExistingLayout = source.replace(
    /^\s*UpdateLayoutConfig\s*\([^)]*\)\s*$/gim,
    "",
  );

  return `${withoutExistingLayout.trimEnd()}\n  UpdateLayoutConfig($c4ShapeInRow="${shapeColumns}", $c4BoundaryInRow="1")`;
}

function appendViewInsideAffordance(group: SVGGElement): SVGGElement | null {
  const rect = Array.from(group.children).find(
    (child): child is SVGRectElement => child.tagName.toLowerCase() === "rect",
  );
  if (!rect) return null;

  const x = Number(rect.getAttribute("x") ?? 0);
  const y = Number(rect.getAttribute("y") ?? 0);
  const width = Number(rect.getAttribute("width") ?? 0);
  const height = Number(rect.getAttribute("height") ?? 0);
  if (!width || !height) return null;

  const affordance = document.createElementNS(SVG_NS, "g");
  affordance.setAttribute("class", "c4-view-inside");
  affordance.setAttribute(
    "transform",
    `translate(${x + Math.max(12, width - 112)} ${y + height - 18})`,
  );
  affordance.setAttribute("aria-hidden", "true");
  affordance.innerHTML =
    '<path d="M0 4h8m-3-3 3 3-3 3"/><text x="14" y="8">View inside</text>';
  group.appendChild(affordance);
  return affordance;
}

/**
 * Lightweight client Mermaid renderer for C4 Context/Containers/Components.
 * Fail soft: on parse/render error, show a short notice instead of crashing.
 */
export function MermaidDiagram({
  source,
  className,
  ariaLabel,
  style,
  onRender,
  activators,
  onActivate,
  fallbackHref,
}: MermaidDiagramProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    setError(null);
    setReady(false);
    host.innerHTML = "";

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const compact = window.matchMedia("(max-width: 767px)").matches;
        const resolvedFontFamily = window.getComputedStyle(document.body).fontFamily;
        const viewportWidth = Math.min(
          window.innerWidth,
          window.screen.availWidth || window.innerWidth,
        );
        const wrappedSource = sourceWithWrappedC4Copy(source, compact);
        const layoutSource = sourceWithResponsiveC4Layout(
          wrappedSource,
          viewportWidth,
          compact,
        );
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          wrap: true,
          theme: "base",
          fontFamily: resolvedFontFamily,
          themeVariables: {
            background: "transparent",
            primaryColor: "#0a0a0a",
            primaryTextColor: "#f2f0eb",
            primaryBorderColor: "#d8d2c5",
            secondaryColor: "#0a0a0a",
            secondaryTextColor: "#f2f0eb",
            secondaryBorderColor: "#9a9690",
            tertiaryColor: "#0a0a0a",
            tertiaryTextColor: "#f2f0eb",
            tertiaryBorderColor: "#9a9690",
            lineColor: "#e8e2d6",
            textColor: "#f2f0eb",
            mainBkg: "#0a0a0a",
            nodeBorder: "#d8d2c5",
          },
          c4: {
            diagramMarginX: compact ? 24 : 32,
            diagramMarginY: compact ? 28 : 32,
            c4ShapeMargin: compact ? 24 : 32,
            c4ShapePadding: 18,
            boxMargin: 12,
            width: compact ? 260 : 292,
            height: compact ? 136 : 142,
            wrap: true,
            wrapPadding: 18,
            personFontFamily: resolvedFontFamily,
            external_personFontFamily: resolvedFontFamily,
            systemFontFamily: resolvedFontFamily,
            external_systemFontFamily: resolvedFontFamily,
            system_dbFontFamily: resolvedFontFamily,
            containerFontFamily: resolvedFontFamily,
            external_containerFontFamily: resolvedFontFamily,
            container_dbFontFamily: resolvedFontFamily,
            componentFontFamily: resolvedFontFamily,
            external_componentFontFamily: resolvedFontFamily,
            component_dbFontFamily: resolvedFontFamily,
            boundaryFontFamily: resolvedFontFamily,
            messageFontFamily: resolvedFontFamily,
            personFontSize: 16,
            external_personFontSize: 16,
            systemFontSize: 16,
            external_systemFontSize: 16,
            system_dbFontSize: 16,
            containerFontSize: 16,
            external_containerFontSize: 16,
            container_dbFontSize: 16,
            componentFontSize: 16,
            external_componentFontSize: 16,
            component_dbFontSize: 16,
            boundaryFontSize: 14,
            messageFontSize: 14,
          },
        });
        const id = `arch-mermaid-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg } = await mermaid.render(id, layoutSource);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        const renderedSvg = hostRef.current.querySelector<SVGSVGElement>("svg");
        if (!renderedSvg) {
          throw new Error("Mermaid rendered without an SVG root");
        }
        onRender?.(renderedSvg);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not render diagram";
        setError(message);
        setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, reactId, onRender]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ready || !activators?.length || !onActivate) return;

    const cleanups: Array<() => void> = [];
    const bound = new WeakSet<Element>();

    const timers: number[] = [];
    const semanticNodes = host.querySelectorAll<SVGGElement>("g.person-man");
    for (const target of semanticNodes) {
      const texts = Array.from(target.children).filter(
        (child): child is SVGTextElement => child.tagName.toLowerCase() === "text",
      );
      const title = texts[1]?.textContent ?? "";
      const semanticText = texts.slice(1).map((text) => text.textContent ?? "");
      const match =
        activators.find((act) =>
          act.labels.some((label) => normalizeLabel(title) === normalizeLabel(label)),
        ) ??
        activators.find((act) =>
          act.labels.some((label) =>
            semanticText.some((text) => normalizeLabel(text) === normalizeLabel(label)),
          ),
        ) ??
        activators.find((act) => act.labels.some((label) => labelMatches(title, label)));
      if (!match) continue;
      if (bound.has(target)) continue;
      bound.add(target);

      const el = target;
      el.style.cursor = "pointer";
      if (match.whisper) {
        el.setAttribute("title", match.whisper);
        el.setAttribute("aria-label", match.whisper);
      }
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.classList.add("arch-mermaid-zoomable");
      const affordance = appendViewInsideAffordance(target);

      const activate = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        el.classList.add("is-activating");
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          onActivate(match.id);
          return;
        }
        timers.push(
          window.setTimeout(() => {
            onActivate(match.id);
          }, 130),
        );
      };
      const onKey = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          activate(event);
        }
      };

      el.addEventListener("click", activate);
      el.addEventListener("keydown", onKey);
      cleanups.push(() => {
        el.removeEventListener("click", activate);
        el.removeEventListener("keydown", onKey);
        el.classList.remove("arch-mermaid-zoomable");
        el.classList.remove("is-activating");
        affordance?.remove();
      });
    }

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      for (const cleanup of cleanups) cleanup();
    };
  }, [ready, activators, onActivate, source]);

  if (error) {
    return (
      <p className={`arch-mermaid-error${className ? ` ${className}` : ""}`} role="status">
        Diagram could not be rendered here.
        {fallbackHref ? (
          <>
            {" "}
            <a href={fallbackHref} target="_blank" rel="noopener noreferrer">
              Open the source on GitHub
            </a>
            .
          </>
        ) : (
          " Open the source on GitHub instead."
        )}
      </p>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`arch-mermaid${className ? ` ${className}` : ""}${ready ? " is-ready" : ""}`}
      role={activators?.length ? "group" : "img"}
      aria-label={ariaLabel ?? "Architecture diagram"}
      aria-busy={!ready}
      style={style}
    />
  );
}
