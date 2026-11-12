import type { Project } from "@/lib/portfolio-schema";

export function ProjectLinks({ links }: { links: Project["links"] }) {
  const items = [
    { href: links.demo, label: "Live demo" },
    { href: links.github, label: "Code" },
    { href: links.story, label: "Write-up" },
  ].filter((item): item is { href: string; label: string } => item.href !== undefined);

  if (items.length === 0) return null;

  return (
    <ul className="inline-links">
      {items.map((item) => (
        <li key={item.label}>
          <a href={item.href}>{item.label}</a>
        </li>
      ))}
    </ul>
  );
}
