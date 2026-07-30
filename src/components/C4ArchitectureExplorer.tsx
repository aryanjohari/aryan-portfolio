"use client";

import { useEffect, useMemo, useState } from "react";

import { C4DiagramViewer } from "@/components/C4DiagramViewer";
import type { MermaidZoomActivator } from "@/components/MermaidDiagram";
import type {
  ProjectC4Data,
  ProjectC4Doc,
  ProjectC4ZoomTarget,
} from "@/lib/portfolio-schema";

export type C4View =
  | { level: "context" }
  | { level: "containers" }
  | { level: "components"; targetId: string };

type C4ArchitectureExplorerProps = {
  title: string;
  c4: ProjectC4Data;
  sourceNote: string;
  githubRepoUrl: string;
  branch?: string;
};

function hasContent(doc: ProjectC4Doc | undefined): boolean {
  return Boolean(doc?.mermaid?.trim() || doc?.markdown?.trim());
}

function hasDiagram(doc: ProjectC4Doc | undefined): boolean {
  return Boolean(doc?.mermaid?.trim());
}

function initialView(c4: ProjectC4Data): C4View {
  if (c4.defaultLevel === "context" && hasDiagram(c4.context)) return { level: "context" };
  if (c4.defaultLevel === "containers" && hasDiagram(c4.containers)) {
    return { level: "containers" };
  }
  if (hasDiagram(c4.context)) return { level: "context" };
  if (hasDiagram(c4.containers)) return { level: "containers" };
  if (hasContent(c4.context)) return { level: "context" };
  return { level: "containers" };
}

function githubBlobUrl(repoUrl: string, path: string | undefined, branch: string): string | undefined {
  if (!path) return undefined;
  return `${repoUrl.replace(/\/$/, "")}/blob/${branch}/${path}`;
}

function docsPath(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return path.replace(/\.(?:mmd|mermaid)$/i, ".md");
}

function extractCaption(markdown: string | undefined, fallback: string): string {
  if (!markdown?.trim()) return fallback;
  const prose = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("#") &&
        !line.startsWith("|") &&
        !line.startsWith("-") &&
        !line.startsWith("```") &&
        !/^(?:C4Context|C4Container|C4Component)\b/.test(line),
    )[0]
    ?.replace(/[*_`#]/g, "")
    .trim();
  if (!prose) return fallback;
  return prose.length > 220 ? `${prose.slice(0, 219)}…` : prose;
}

function componentIdForZoom(c4: ProjectC4Data, zoom: ProjectC4ZoomTarget): string | undefined {
  if (zoom.componentId) return zoom.componentId;
  return c4.diveTargets.find(
    (target) =>
      target.id === zoom.id ||
      target.coversContainers?.includes(zoom.id) ||
      target.matchLabels?.some((label) => zoom.matchLabels.includes(label)),
  )?.id;
}

export function C4ArchitectureExplorer({
  title,
  c4,
  sourceNote,
  githubRepoUrl,
  branch = "main",
}: C4ArchitectureExplorerProps) {
  const [view, setView] = useState<C4View>(() => initialView(c4));
  const [direction, setDirection] = useState<"in" | "out">("in");

  const componentTarget =
    view.level === "components"
      ? c4.diveTargets.find((target) => target.id === view.targetId)
      : undefined;
  const currentDoc =
    view.level === "context"
      ? c4.context
      : view.level === "containers"
        ? c4.containers
        : c4.components[view.targetId];
  const levelLabel =
    view.level === "context" ? "Context" : view.level === "containers" ? "Containers" : "Components";

  const currentZooms = useMemo(
    () =>
      c4.zoomTargets.filter((zoom) =>
        view.level === "context"
          ? zoom.fromLevel === "context"
          : view.level === "containers"
            ? zoom.fromLevel === "containers"
            : false,
      ),
    [c4.zoomTargets, view.level],
  );

  const activators = useMemo<MermaidZoomActivator[]>(
    () =>
      currentZooms.flatMap((zoom) => {
        const available =
          zoom.toLevel === "containers"
            ? hasDiagram(c4.containers)
            : hasDiagram(c4.components[componentIdForZoom(c4, zoom) ?? ""]);
        if (!available) return [];
        return [
          {
            id: zoom.id,
            labels: zoom.matchLabels.length ? zoom.matchLabels : [zoom.label, zoom.id],
            whisper: "View inside",
          },
        ];
      }),
    [c4, currentZooms],
  );

  const canBack =
    view.level === "components" ||
    (view.level === "containers" && hasContent(c4.context));
  const canReset = view.level !== "context" && hasContent(c4.context);
  const docsHref = githubBlobUrl(
    githubRepoUrl,
    docsPath(currentDoc?.path) ?? currentDoc?.path,
    branch,
  );

  const summary = extractCaption(
    currentDoc?.markdown,
    view.level === "context"
      ? `The systems and people around ${title}.`
      : view.level === "containers"
        ? `The deployable parts that make up ${title}.`
        : `The components inside ${componentTarget?.label ?? view.targetId}.`,
  );

  function navigate(next: C4View, nextDirection: "in" | "out") {
    setDirection(nextDirection);
    setView(next);
  }

  function goBack() {
    if (view.level === "components") {
      navigate({ level: "containers" }, "out");
    } else if (view.level === "containers" && hasContent(c4.context)) {
      navigate({ level: "context" }, "out");
    }
  }

  function activateZoom(zoomId: string) {
    const zoom = currentZooms.find((candidate) => candidate.id === zoomId);
    if (!zoom) return;
    if (zoom.toLevel === "containers" && hasDiagram(c4.containers)) {
      navigate({ level: "containers" }, "in");
      return;
    }
    if (zoom.toLevel === "components") {
      const targetId = componentIdForZoom(c4, zoom);
      if (targetId && hasDiagram(c4.components[targetId])) {
        navigate({ level: "components", targetId }, "in");
      }
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Escape" || event.key === "Backspace") && canBack) {
        const target = event.target as HTMLElement | null;
        if (event.key === "Backspace" && target?.matches("input, textarea, [contenteditable]")) return;
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <section
      className="arch-journey-section arch-c4-explorer"
      aria-labelledby="architecture-overview-heading"
      data-exhibit-act="diagram"
      data-diagram-mode="c4"
      data-arch-level={view.level}
    >
      <header className="arch-overview-header project-exhibit-rail">
        <nav className="arch-c4-breadcrumb" aria-label="Architecture level">
          <span aria-current={view.level === "context" ? "page" : undefined}>Context</span>
          {view.level !== "context" ? (
            <>
              <span aria-hidden="true">/</span>
              <span aria-current={view.level === "containers" ? "page" : undefined}>Containers</span>
            </>
          ) : null}
          {view.level === "components" ? (
            <>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{componentTarget?.label ?? view.targetId}</span>
            </>
          ) : null}
        </nav>
        <h2 id="architecture-overview-heading" className="project-exhibit-section-title">
          How it works
        </h2>
        <p className="arch-overview-summary">{summary}</p>
        <p className="arch-overview-source">{sourceNote}</p>
      </header>

      <div className="arch-c4-layout">
        <div className="arch-c4-navigation">
          <div className="arch-c4-navigation-actions">
            <button type="button" className="arch-c4-nav-button" disabled={!canBack} onClick={goBack}>
              ← Back
            </button>
            <button
              type="button"
              className="arch-c4-nav-button"
              disabled={!canReset}
              onClick={() => navigate({ level: "context" }, "out")}
            >
              Reset
            </button>
          </div>
          <p>
            <strong>{levelLabel}</strong>
            <span>
              {currentZooms.some((zoom) =>
                activators.some((activator) => activator.id === zoom.id),
              )
                ? "Select a marked node to view inside."
                : "Drag to pan, or use the view controls to inspect the diagram."}
            </span>
          </p>
          {docsHref ? (
            <a href={docsHref} target="_blank" rel="noopener noreferrer">
              View docs ↗
            </a>
          ) : null}
        </div>

        <div className={`arch-c4-stage arch-c4-stage--${direction}`}>
          {currentDoc?.mermaid ? (
            <C4DiagramViewer
              key={`${view.level}-${view.level === "components" ? view.targetId : ""}`}
              source={currentDoc.mermaid}
              ariaLabel={`${levelLabel} diagram for ${
                view.level === "components" ? componentTarget?.label ?? title : title
              }`}
              levelLabel={levelLabel}
              activators={activators}
              onActivate={activateZoom}
              fallbackHref={docsHref}
              allowFullscreen
            />
          ) : (
            <p className="arch-dive-fallback" role="status">
              No {levelLabel.toLowerCase()} diagram is available yet.
              {docsHref ? (
                <>
                  {" "}
                  <a href={docsHref} target="_blank" rel="noopener noreferrer">
                    View the architecture docs on GitHub
                  </a>
                  .
                </>
              ) : null}
            </p>
          )}
        </div>

        {currentZooms.length > 0 ? (
          <ul className="arch-c4-zoom-list" aria-label="Available deeper architecture views">
            {currentZooms.map((zoom) => {
              const targetId =
                zoom.toLevel === "components" ? componentIdForZoom(c4, zoom) : undefined;
              const available =
                zoom.toLevel === "containers"
                  ? hasDiagram(c4.containers)
                  : Boolean(targetId && hasDiagram(c4.components[targetId]));
              return (
                <li key={zoom.id}>
                  <button
                    type="button"
                    className="arch-c4-zoom-chip"
                    disabled={!available}
                    title={available ? `View inside ${zoom.label}` : "Component diagram unavailable"}
                    onClick={() => activateZoom(zoom.id)}
                  >
                    {zoom.label}
                    <span aria-hidden="true">{available ? " ↘" : " —"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
