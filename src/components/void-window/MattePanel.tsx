"use client";

import type { MattePanelProps } from "@/components/void-window/types";

/**
 * DOM matte in workshop tablet family — cream rim, void interior.
 * Inline plate holds the canvas skim; Dive expands the same plate to tools mode.
 */
export function MattePanel({
  title,
  invitation,
  onDive,
  onClose,
  children,
  className,
  layer = "plate",
}: MattePanelProps) {
  const isDive = layer === "dive";

  return (
    <div
      className={["matte-panel", isDive ? "is-dive" : "is-plate", className]
        .filter(Boolean)
        .join(" ")}
      data-atmosphere-depth
      data-matte-layer={layer}
    >
      <div className="matte-panel-shade" aria-hidden="true" />
      <div className="matte-panel-chrome">
        <p className="matte-panel-title">{title}</p>
        <div className="matte-panel-chrome-actions">
          {!isDive ? (
            <button type="button" className="matte-panel-dive" onClick={onDive}>
              Dive
            </button>
          ) : null}
          {isDive && onClose ? (
            <button type="button" className="matte-panel-close" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>
      <div className="matte-panel-body">
        {children ? (
          <div
            className="matte-panel-preview"
            {...(!isDive ? { inert: true as const } : {})}
          >
            {children}
          </div>
        ) : (
          <p className="matte-panel-whisper">{invitation}</p>
        )}
        {!isDive && children ? (
          <p className="matte-panel-whisper matte-panel-whisper--footer">
            {invitation}
          </p>
        ) : null}
      </div>
    </div>
  );
}
