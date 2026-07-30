"use client";

import { useMemo, useState } from "react";

import { ArchitectureGraphView } from "@/components/ArchitectureGraphView";
import { C4ArchitectureExplorer } from "@/components/C4ArchitectureExplorer";
import type { ArchitectureGraph } from "@/lib/architecture-graph";
import { resolveArchitectureSkin } from "@/lib/architecture-graph";
import { resolveTourStepsFromGraph } from "@/lib/architecture-walkthrough";
import type { ProjectC4Data } from "@/lib/portfolio-schema";

type ArchitectureJourneyProps = {
  title: string;
  /** Owned graph IR — fallback when C4 Context/Containers are missing. */
  graph?: ArchitectureGraph;
  sourceNote: string;
  slug?: string;
  c4?: ProjectC4Data;
  githubRepoUrl: string;
  branch?: string;
};

function hasC4Surface(c4: ProjectC4Data | undefined): c4 is ProjectC4Data {
  return Boolean(
    c4 &&
      (c4.context?.mermaid ||
        c4.context?.markdown ||
        c4.containers?.mermaid ||
        c4.containers?.markdown),
  );
}

/**
 * C4 is the primary architecture path. The owned graph remains a deliberately
 * separate fallback for projects that have no C4 context/container documents.
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
  if (hasC4Surface(c4)) {
    return (
      <C4ArchitectureExplorer
        title={title}
        c4={c4}
        sourceNote={sourceNote}
        githubRepoUrl={githubRepoUrl}
        branch={branch}
      />
    );
  }

  return (
    <OwnedArchitectureFallback
      title={title}
      graph={graph}
      sourceNote={sourceNote}
      slug={slug}
    />
  );
}

function OwnedArchitectureFallback({
  title,
  graph,
  sourceNote,
  slug,
}: Pick<ArchitectureJourneyProps, "title" | "graph" | "sourceNote" | "slug">) {
  const skin = graph ? resolveArchitectureSkin(graph, slug) : undefined;
  const steps = useMemo(() => (graph ? resolveTourStepsFromGraph(graph) : []), [graph]);
  const [activeBeatId, setActiveBeatId] = useState<string | null>(steps[0]?.id ?? null);
  const highlightedIds = useMemo(() => {
    const step = steps.find((candidate) => candidate.id === activeBeatId);
    return step?.spotlightIds ?? (activeBeatId ? [activeBeatId] : []);
  }, [steps, activeBeatId]);

  if (!graph) {
    return (
      <section
        className="arch-journey-section"
        aria-labelledby="architecture-overview-heading"
        data-exhibit-act="diagram"
        data-diagram-mode="owned"
      >
        <div className="arch-overview-header project-exhibit-rail">
          <h2 id="architecture-overview-heading" className="project-exhibit-section-title">
            How it works
          </h2>
        </div>
        <p className="arch-dive-fallback project-exhibit-rail" role="status">
          Architecture docs are not available for this project yet.
        </p>
      </section>
    );
  }

  const summary =
    graph.summary?.trim() ||
    (graph.title ? `Here’s how ${graph.title} works end to end.` : "Here’s how the system works.");

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
                    onMouseEnter={() => {
                      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                        setActiveBeatId(step.id);
                      }
                    }}
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

        <div className="arch-overview-stage">
          <div className="arch-overview-graph">
            <ArchitectureGraphView
              graph={graph}
              slug={slug}
              skin={skin}
              staticFull
              ariaLabel={`Architecture for ${title}`}
              highlightedIds={highlightedIds}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
