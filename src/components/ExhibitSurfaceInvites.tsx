"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { DemoPanel } from "@/components/DemoPanel";
import {
  architectureSourceCopy,
  ProjectDiagram,
} from "@/components/ProjectDiagram";
import { MattePanel } from "@/components/void-window/MattePanel";
import type { MatteSurfaceId } from "@/components/void-window/types";
import type { Project } from "@/lib/projects";
import { contentNoticeHeading } from "@/lib/projects";

type ExhibitSurfacesProps = {
  project: Project;
  primary: MatteSurfaceId;
  hasContent: boolean;
  showProof: boolean;
  hasArchitecture: boolean;
};

const SURFACE_COPY: Record<
  MatteSurfaceId,
  { title: string; invitation: string; headingId: string }
> = {
  proof: {
    title: "Proof",
    invitation: "Dive to use the live stage",
    headingId: "project-proof-heading",
  },
  architecture: {
    title: "Architecture",
    invitation: "Dive to explore the system map",
    headingId: "project-architecture-heading",
  },
};

function proofLede(project: Project): string {
  const summary = project.summary.trim();
  if (summary) return summary;
  return "Live stage for this project — skim here, dive to interact.";
}

function architectureLede(project: Project): string {
  return architectureSourceCopy(project.diagram);
}

/**
 * Stage act: demo + architecture as a shared beat.
 * Two columns when both exist; stacks on narrow viewports.
 */
export function ExhibitSurfaces({
  project,
  primary,
  hasContent,
  showProof,
  hasArchitecture,
}: ExhibitSurfacesProps) {
  const order: MatteSurfaceId[] =
    primary === "proof"
      ? ["proof", "architecture"]
      : ["architecture", "proof"];

  const surfaces = order.filter((id) =>
    id === "proof" ? showProof : hasArchitecture,
  );

  const duo = surfaces.length > 1;

  return (
    <>
      {!hasContent ? (
        <aside className="content-notice project-exhibit-rail" role="status">
          <p className="content-notice-heading">
            {contentNoticeHeading(project.contentStatus)}
          </p>
          {project.contentMessage ? (
            <p className="content-notice-message">{project.contentMessage}</p>
          ) : null}
          <a
            href={`https://github.com/${project.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="content-notice-link"
          >
            View repository on GitHub
          </a>
        </aside>
      ) : null}

      {surfaces.length > 0 ? (
        <section
          className="exhibit-stage"
          aria-labelledby="project-stage-heading"
          data-exhibit-act="stage"
        >
          <header className="exhibit-stage-header project-exhibit-rail">
            <p className="exhibit-stage-kicker">Look closer</p>
            <h2
              id="project-stage-heading"
              className="project-exhibit-section-title"
            >
              Stage
            </h2>
          </header>

          <div
            className={`exhibit-stage-grid${duo ? " exhibit-stage-grid--duo" : ""}`}
          >
            {surfaces.map((surfaceId) => (
              <ExhibitStageColumn
                key={surfaceId}
                id={surfaceId}
                project={project}
                primary={surfaceId === primary}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function ExhibitStageColumn({
  id,
  project,
  primary,
}: {
  id: MatteSurfaceId;
  project: Project;
  primary: boolean;
}) {
  const copy = SURFACE_COPY[id];
  const titleId = useId();
  const diveRootRef = useRef<HTMLDivElement>(null);
  const [dive, setDive] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const lede = id === "proof" ? proofLede(project) : architectureLede(project);
  const presentation = dive ? "tools" : "canvas";

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    if (!dive) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const portal = document.querySelector<HTMLElement>("[data-void-scroll]");
    const prevOverflow = portal?.style.overflow ?? "";
    if (portal) portal.style.overflow = "hidden";
    document.documentElement.dataset.matteOpen = "1";

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setDive(false);
    };
    window.addEventListener("keydown", onKey, true);

    queueMicrotask(() => {
      diveRootRef.current
        ?.querySelector<HTMLElement>(".matte-panel-close")
        ?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (portal) portal.style.overflow = prevOverflow;
      delete document.documentElement.dataset.matteOpen;
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [dive]);

  const surface = (
    <div
      className="matte-surface-host"
      data-matte-surface={id}
      data-void-scroll-exempt
    >
      {id === "proof" ? (
        <DemoPanel demo={project.demo} presentation={presentation} />
      ) : (
        <ProjectDiagram
          title={project.title}
          diagram={project.diagram}
          slug={project.slug}
          githubRepoUrl={project.links.github}
          branch={project.branch}
          presentation={presentation}
        />
      )}
    </div>
  );

  const divePortal =
    canPortal && dive
      ? createPortal(
          <div
            ref={diveRootRef}
            className="exhibit-matte-dive"
            data-void-scroll-exempt
          >
            <button
              type="button"
              className="exhibit-matte-backdrop"
              aria-label="Return to story"
              tabIndex={-1}
              onClick={() => setDive(false)}
            />
            <div
              className="exhibit-matte-frame exhibit-matte-frame--dive"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <span id={titleId} className="visually-hidden">
                {copy.title}
              </span>
              <MattePanel
                title={copy.title}
                invitation={copy.invitation}
                layer="dive"
                onDive={() => setDive(true)}
                onClose={() => setDive(false)}
              >
                {surface}
              </MattePanel>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <article
      className={[
        "exhibit-stage-col",
        `exhibit-stage-col--${id}`,
        primary ? "exhibit-stage-col--primary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby={copy.headingId}
      data-exhibit-act={id === "proof" ? "stage" : "how"}
    >
      <div className="exhibit-stage-col-copy">
        <h3 id={copy.headingId} className="exhibit-stage-col-title">
          {copy.title}
        </h3>
        <p className="exhibit-surface-lede">{lede}</p>
      </div>

      <div
        className={`exhibit-matte-slot${dive ? " is-holding" : ""}`}
        data-void-scroll-exempt
      >
        {dive ? (
          <div className="exhibit-matte-slot-spacer" aria-hidden="true" />
        ) : (
          <div className="exhibit-matte-frame">
            <MattePanel
              title={copy.title}
              invitation={copy.invitation}
              layer="plate"
              onDive={() => setDive(true)}
              onClose={() => setDive(false)}
            >
              {surface}
            </MattePanel>
          </div>
        )}
      </div>
      {divePortal}
    </article>
  );
}

/** @deprecated Use ExhibitSurfaces */
export const ExhibitSurfaceInvites = ExhibitSurfaces;
