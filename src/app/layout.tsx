import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isAskOn } from "@/lib/ask/gemini";
import type { AskPages } from "@/lib/ask/suggestions";
import { getProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export function generateMetadata(): Metadata {
  const profile = getProfile();
  return {
    title: `${profile.name} · ${profile.headline}`,
    description: profile.tagline,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = getProfile();
  const askEnabled = isAskOn();
  // Projects with a page of their own, so the Ask box can suggest questions about the one being read.
  const askPages: AskPages = Object.fromEntries(
    getProjects()
      .filter((project) => project.story)
      .map((project) => [`/projects/${project.slug}`, { title: project.title, hasDemo: Boolean(project.links.demo) }]),
  );

  return (
    // The boot script may set data-theme before React loads, so the attribute can differ from the server's HTML.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* The Ask box needs JS to answer, so with JS off it isn't shown at all. */}
        {askEnabled && (
          <noscript>
            <style>{".ask, .ask-trigger, .ask-invite { display: none !important; }"}</style>
          </noscript>
        )}
      </head>
      <body className={`${newsreader.variable} ${ibmPlexMono.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="site-shell">
          <SiteHeader name={profile.name} links={profile.links} askEnabled={askEnabled} askPages={askPages} />
          {children}
          <SiteFooter links={profile.links} />
        </div>
      </body>
    </html>
  );
}
