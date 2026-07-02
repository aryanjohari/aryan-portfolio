import type { DemoConfig } from "@/lib/projects";

type DemoPanelProps = {
  demo?: DemoConfig;
};

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

  return (
    <div className="demo-panel demo-panel--pending" aria-label={`${demoTypeLabel(demo)} — coming soon`}>
      <p className="demo-panel-label">sandbox</p>
      <p className="demo-panel-type">{demoTypeLabel(demo)}</p>
      <p className="demo-panel-message">Coming soon</p>
      <p className="demo-panel-hint">
        Demo type <code>{demo.type}</code> is registered but not yet implemented.
      </p>
    </div>
  );
}
