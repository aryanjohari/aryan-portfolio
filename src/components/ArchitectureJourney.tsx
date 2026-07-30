"use client";

import { useMemo, useState } from "react";

import { ArchitectureDive } from "@/components/ArchitectureDive";
import { ArchitectureGraphView } from "@/components/ArchitectureGraphView";
import type { ArchitectureGraph } from "@/lib/architecture-graph";
import { resolveArchitectureSkin } from "@/lib/architecture-graph";
import { resolveTourStepsFromGraph } from "@/lib/architecture-walkthrough";
import type { ProjectC4Data } from "@/lib/portfolio-schema";

type ArchitectureJourneyProps = {
  title: string;
  graph: ArchitectureGraph;
  sourceNote: string;
  slug?: string;
  c4?: ProjectC4Data;
  githubRepoUrl: string;
  branch?: string;
};

/**
 * C4-ready architecture surface: fitted Containers overview + path beats,
 * with an optional user-driven Components dive (no scroll/camera theatre).
 */
export function ArchitectureJourney({
  title,
  graph,
  sourceNote,
  slug,
  c4,
  githubRepoUrl,
  branch = "main",
}: ArchitectureJourneyProps) {
  const skin = resolveArchitectureSkin(graph, slug);
  const steps = resolveTourStepsFromGraph(graph);
  const diveTargets = useMemo(() => c4?.diveTargets ?? [], [c4?.diveTargets]);
  const canDive = diveTargets.length > 0;

  const diveNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const target of diveTargets) {
      for (const nodeId of target.graphNodeIds) ids.add(nodeId);
    }
    return [...ids];
  }, [diveTargets]);

  const nodeToDiveId = useMemo(() => {
    const map = new Map<string, string>();
    for (const target of diveTargets) {
      for (const nodeId of target.graphNodeIds) {
        if (!map.has(nodeId)) map.set(nodeId, target.id);
      }
    }
    return map;
  }, [diveTargets]);

  const [activeBeatId, setActiveBeatId] = useState<string | null>(
    steps[0]?.id ?? null,
  );
  const [diveTargetId, setDiveTargetId] = useState<string | null>(null);

  const highlightedIds = useMemo(() => {
    const step = steps.find((s) => s.id === activeBeatId);
    return step?.spotlightIds ?? (activeBeatId ? [activeBeatId] : []);
  }, [steps, activeBeatId]);

  const summary =
    graph.summary?.trim() ||
    (graph.title
      ? `Here’s how ${graph.title} works end to end.`
      : "Here’s how the system works end to end.");

  function openDive(targetId?: string) {
    if (!canDive) return;
    setDiveTargetId(targetId ?? diveTargets[0]?.id ?? null);
  }

  function handleNodeActivate(nodeId: string) {
    const diveId = nodeToDiveId.get(nodeId);
    if (diveId) openDive(diveId);
  }

  return (
    <section
      className="arch-journey-section"
      aria-labelledby="architecture-overview-heading"
      data-exhibit-act="diagram"
      data-diagram-mode="owned"
      data-arch-skin={skin}
    >
      <div className="arch-overview-header project-exhibit-rail">
        <h2 id="architecture-overview-heading" className="project-exhibit-section-title">
          How it works
        </h2>
        <p className="arch-overview-summary">{summary}</p>
        {sourceNote ? <p className="arch-overview-source">{sourceNote}</p> : null}
        {graph.notes ? <p className="arch-overview-source">{graph.notes}</p> : null}
      </div>

      <div className="arch-overview-layout">
        <div className="arch-overview-graph">
          <ArchitectureGraphView
            graph={graph}
            slug={slug}
            skin={skin}
            staticFull
            ariaLabel={`Architecture for ${title}`}
            highlightedIds={highlightedIds}
            diveNodeIds={diveNodeIds}
            onNodeActivate={canDive ? handleNodeActivate : undefined}
          />
        </div>

        {steps.length > 0 ? (
          <ol className="arch-path-story" aria-label="Architecture path">
            {steps.map((step, index) => {
              const isActive = step.id === activeBeatId;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    className={`arch-path-beat${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => setActiveBeatId(step.id)}
                    onMouseEnter={() => setActiveBeatId(step.id)}
                    onFocus={() => setActiveBeatId(step.id)}
                  >
                    <span className="arch-path-beat-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="arch-path-beat-copy">
                      <span className="arch-path-beat-title">{step.title}</span>
                      <span className="arch-path-beat-body">{step.body}</span>
                      {step.items?.length ? (
                        <ul className="arch-path-beat-items">
                          {step.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <div className="arch-overview-actions project-exhibit-rail">
        <button
          type="button"
          className="arch-dive-open"
          disabled={!canDive}
          title={
            canDive
              ? "Open a component-level architecture dive"
              : "Component-level architecture dive is not available for this project yet."
          }
          onClick={() => openDive()}
        >
          {canDive ? "Dive into architecture" : "Dive to components — unavailable"}
        </button>
        {canDive ? (
          <p className="arch-dive-hint">
            Or click a marked container on the map.
          </p>
        ) : null}
      </div>

      {diveTargetId && c4 ? (
        <ArchitectureDive
          c4={c4}
          targetId={diveTargetId}
          githubRepoUrl={githubRepoUrl}
          branch={branch}
          onClose={() => setDiveTargetId(null)}
          onSelectTarget={setDiveTargetId}
        />
      ) : null}
    </section>
  );
}
