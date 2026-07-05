"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ExhibitVariant } from "@/data/exhibits";
import { getExhibitContent } from "@/data/exhibits";
import type { DemoConfig } from "@/lib/projects";

type DemoPanelProps = {
  demo?: DemoConfig;
};

const IFRAME_LOAD_TIMEOUT_MS = 8000;

const EXHIBIT_LABELS: Record<ExhibitVariant, string> = {
  "api-sample": "api sample",
  "terminal-log": "terminal log",
  metrics: "metrics",
};

function demoTypeLabel(demo: DemoConfig): string {
  switch (demo.type) {
    case "iframe":
      return "iframe demo";
    case "api":
      return "api playground";
    case "exhibit":
      return `exhibit · ${EXHIBIT_LABELS[demo.variant]}`;
    case "edge":
      return "edge proxy";
  }
}

function OpenInNewTabLink({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "demo-panel-external-link"}
    >
      open in new tab
    </a>
  );
}

function IframeDemo({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "error" : current));
    }, IFRAME_LOAD_TIMEOUT_MS);

    return clearLoadTimeout;
  }, [url, clearLoadTimeout]);

  const handleLoad = () => {
    clearLoadTimeout();
    setStatus("loaded");
  };

  const handleError = () => {
    clearLoadTimeout();
    setStatus("error");
  };

  return (
    <div
      className="demo-panel demo-panel--iframe"
      aria-label="Project demo sandbox"
    >
      <div className="demo-panel-iframe-header">
        <span className="demo-panel-label">sandbox</span>
        <OpenInNewTabLink url={url} />
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="demo-panel-mobile-link"
      >
        open in new tab
      </a>

      <div className="demo-panel-iframe-body">
        {status === "loading" && (
          <div className="demo-panel-iframe-overlay" aria-live="polite">
            <p className="demo-panel-message">Loading demo…</p>
          </div>
        )}

        {status === "error" && (
          <div
            className="demo-panel-iframe-overlay demo-panel-iframe-overlay--error"
            role="alert"
          >
            <p className="demo-panel-message">Demo could not be embedded</p>
            <p className="demo-panel-hint">
              The site may block iframe embedding (X-Frame-Options). Open it
              directly instead.
            </p>
            <OpenInNewTabLink
              url={url}
              className="demo-panel-fallback-button"
            />
          </div>
        )}

        <iframe
          src={url}
          title="Project demo"
          allow="camera; microphone; fullscreen"
          className="demo-panel-iframe"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={handleLoad}
          onError={handleError}
          hidden={status === "error"}
        />
      </div>
    </div>
  );
}

function ExhibitDemo({ variant }: { variant: ExhibitVariant }) {
  const content = getExhibitContent(variant);

  return (
    <div
      className="demo-panel demo-panel--exhibit"
      aria-label={`Static exhibit — ${EXHIBIT_LABELS[variant]}`}
    >
      <div className="demo-panel-exhibit-header">
        <span className="demo-panel-label">exhibit</span>
        <span className="demo-panel-exhibit-type">{EXHIBIT_LABELS[variant]}</span>
      </div>
      <pre className="demo-panel-exhibit-body">{content}</pre>
    </div>
  );
}

function ComingSoonDemo({ demo }: { demo: DemoConfig }) {
  return (
    <div
      className="demo-panel demo-panel--pending"
      aria-label={`${demoTypeLabel(demo)} — coming soon`}
    >
      <p className="demo-panel-label">sandbox</p>
      <p className="demo-panel-type">{demoTypeLabel(demo)}</p>
      <p className="demo-panel-message">Coming soon</p>
      <p className="demo-panel-hint">
        Demo type <code>{demo.type}</code> is registered but not yet implemented.
      </p>
    </div>
  );
}

export function DemoPanel({ demo }: DemoPanelProps) {
  if (!demo) {
    return (
      <div className="demo-panel demo-panel--unwired" aria-label="Demo not wired">
        <p className="demo-panel-label">sandbox</p>
        <p className="demo-panel-message">Demo not wired</p>
        <p className="demo-panel-hint">
          Wire a demo in <code>src/data/registry.ts</code> to enable this panel.
        </p>
      </div>
    );
  }

  if (demo.type === "iframe") {
    return <IframeDemo url={demo.url} />;
  }

  if (demo.type === "exhibit") {
    return <ExhibitDemo variant={demo.variant} />;
  }

  return <ComingSoonDemo demo={demo} />;
}
