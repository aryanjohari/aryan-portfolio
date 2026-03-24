import Link from "next/link";

import { HomeHero } from "@/components/home/HomeHero";
import { siteConfig } from "../../site.config";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <HomeHero />
      <div
        className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between px-6 py-10 sm:px-10 lg:px-14"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgb(0 0 0 / 0.78) 0%, rgb(0 0 0 / 0.4) 42%, transparent 72%)",
        }}
      >
        <header className="pointer-events-none max-w-xl space-y-6 pt-4 sm:pt-8">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            Portfolio
          </p>
          <h1 className="font-heading text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            {siteConfig.authorName}
          </h1>
          <p className="max-w-md font-mono text-sm leading-relaxed text-muted">
            Brutalist monospace meets serif tension. Neon accent on absolute
            black.
          </p>
        </header>
        <nav className="pointer-events-auto mb-4 mt-auto flex flex-wrap gap-3 font-mono text-xs uppercase tracking-wider text-muted">
          <Link
            href="/scene"
            className="border border-surface px-4 py-2 transition-colors hover:border-acid-accent hover:text-foreground"
          >
            WebGL test
          </Link>
          <a
            href={siteConfig.urls.githubApiBase}
            className="border border-surface px-4 py-2 transition-colors hover:border-muted hover:text-foreground"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
      </div>
    </div>
  );
}
