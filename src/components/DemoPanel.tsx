"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DemoConfig } from "@/lib/projects";

type DemoPanelProps = {
  demo?: DemoConfig;
};

const IFRAME_LOAD_TIMEOUT_MS = 8000;

function demoTypeLabel(demo: DemoConfig): string {
  switch (demo.type) {
    case "iframe":
      return "iframe demo";
    case "api":
      return "api playground";
    case "exhibit":
      return "exhibit";
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

  return <ComingSoonDemo demo={demo} />;
}
