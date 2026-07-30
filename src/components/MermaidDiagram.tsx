"use client";

import { useEffect, useId, useRef, useState } from "react";

type MermaidDiagramProps = {
  source: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * Lightweight client Mermaid renderer for C3 Dive diagrams.
 * Fail soft: on parse/render error, show a short notice instead of crashing.
 */
export function MermaidDiagram({ source, className, ariaLabel }: MermaidDiagramProps) {
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
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "dark",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });
        // C4Component (and flowchart) both go through the same render path.
        const id = `arch-mermaid-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg } = await mermaid.render(id, source);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
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
  }, [source, reactId]);

  if (error) {
    return (
      <p className={`arch-mermaid-error${className ? ` ${className}` : ""}`} role="status">
        Diagram could not be rendered here. Open the source on GitHub instead.
      </p>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`arch-mermaid${className ? ` ${className}` : ""}${ready ? " is-ready" : ""}`}
      role="img"
      aria-label={ariaLabel ?? "Component architecture diagram"}
      aria-busy={!ready}
    />
  );
}
