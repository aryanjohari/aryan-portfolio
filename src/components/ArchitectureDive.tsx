"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MermaidDiagram } from "@/components/MermaidDiagram";
import type { ProjectC4Data, ProjectC4DiveTarget } from "@/lib/portfolio-schema";

type ArchitectureDiveProps = {
  c4: ProjectC4Data;
  targetId: string;
  githubRepoUrl: string;
  /** Repo default branch for GitHub doc links. */
  branch?: string;
  onClose: () => void;
  onSelectTarget: (id: string) => void;
};

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.25;
const ZOOM_STEP = 0.25;

function extractCaption(markdown: string | undefined, fallbackLabel: string): string {
  if (!markdown?.trim()) {
    return `A closer look at ${fallbackLabel}.`;
  }

  const whatMatch = markdown.match(/##\s+What it does\s*\n+([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
  if (whatMatch?.[1]) {
    const para = whatMatch[1]
      .trim()
      .split(/\n\n+/)[0]
      ?.replace(/\n+/g, " ")
      .replace(/[*_`#]/g, "")
      .trim();
    if (para) return para.length > 280 ? `${para.slice(0, 279)}…` : para;
  }

  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("-"));
  const first = lines[0]?.replace(/[*_`]/g, "").trim();
  if (first) return first.length > 280 ? `${first.slice(0, 279)}…` : first;
  return `A closer look at ${fallbackLabel}.`;
}

function githubDocUrl(
  repoUrl: string,
  path: string | undefined,
  diveId: string,
  branch: string,
): string {
  const base = repoUrl.replace(/\/$/, "");
  const docPath = path ?? `docs/c4/3-components/${diveId}.md`;
  return `${base}/blob/${branch}/${docPath}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ArchitectureDive({
  c4,
  targetId,
  githubRepoUrl,
  branch = "main",
  onClose,
  onSelectTarget,
}: ArchitectureDiveProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);
  const [zoomByTarget, setZoomByTarget] = useState<Record<string, number>>({});
  const targets = c4.diveTargets;
  const index = Math.max(
    0,
    targets.findIndex((t) => t.id === targetId),
  );
  const target: ProjectC4DiveTarget | undefined = targets[index] ?? targets[0];
  const component = target ? c4.components[target.id] : undefined;
  const zoom = zoomByTarget[targetId] ?? 1;

  const requestClose = useCallback(() => {
    if (closing) return;
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    setClosing(true);
  }, [closing, onClose]);

  const setZoom = useCallback(
    (next: number | ((prev: number) => number)) => {
      setZoomByTarget((prev) => {
        const current = prev[targetId] ?? 1;
        const value = typeof next === "function" ? next(current) : next;
        return { ...prev, [targetId]: value };
      });
    },
    [targetId],
  );

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => onClose(), 200);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Prefer Back button for immediate Escapability; fall back to panel.
    (closeButtonRef.current ?? panelRef.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      // Focus trap inside the dialog
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [requestClose, targetId]);

  if (!target) return null;

  const caption = extractCaption(component?.markdown, target.label);
  const hasMermaid = Boolean(component?.mermaid?.trim());
  const docsUrl = githubDocUrl(githubRepoUrl, component?.path, target.id, branch);
  const hasPrev = targets.length > 1;
  const prevTarget = targets[(index - 1 + targets.length) % targets.length];
  const nextTarget = targets[(index + 1) % targets.length];

  return (
    <div
      className={`arch-dive-root${closing ? " is-closing" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        className="arch-dive-backdrop"
        aria-label="Close architecture dive"
        tabIndex={-1}
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        className="arch-dive-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="arch-dive-header">
          <div className="arch-dive-header-copy">
            <p className="arch-dive-kicker">Components</p>
            <h3 id={titleId} className="arch-dive-title">
              {target.label}
            </h3>
          </div>
          <div className="arch-dive-header-actions">
            {hasPrev ? (
              <>
                <button
                  type="button"
                  className="arch-dive-nav"
                  onClick={() => onSelectTarget(prevTarget.id)}
                  aria-label={`Previous: ${prevTarget.label}`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="arch-dive-nav"
                  onClick={() => onSelectTarget(nextTarget.id)}
                  aria-label={`Next: ${nextTarget.label}`}
                >
                  ›
                </button>
              </>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              className="arch-dive-back"
              onClick={requestClose}
            >
              ← Overview
            </button>
          </div>
        </header>

        <p className="arch-dive-caption">{caption}</p>

        {hasMermaid ? (
          <div className="arch-dive-toolbar" role="group" aria-label="Diagram zoom">
            <button
              type="button"
              className="arch-dive-zoom"
              aria-label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            >
              −
            </button>
            <button
              type="button"
              className="arch-dive-zoom"
              aria-label="Reset zoom"
              onClick={() => setZoom(1)}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="arch-dive-zoom"
              aria-label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            >
              +
            </button>
          </div>
        ) : null}

        <div className="arch-dive-stage">
          {hasMermaid && component?.mermaid ? (
            <MermaidDiagram
              source={component.mermaid}
              ariaLabel={`Component diagram for ${target.label}`}
              style={{ transform: `scale(${zoom})` }}
            />
          ) : (
            <p className="arch-dive-fallback" role="status">
              No component diagram is available for this container yet.
            </p>
          )}
        </div>

        <p className="arch-dive-footer">
          <a href={docsUrl} target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
          {targets.length > 1 ? (
            <span className="arch-dive-count">
              {index + 1} / {targets.length}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
