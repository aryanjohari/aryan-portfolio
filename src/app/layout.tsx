import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getProfile } from "@/lib/profile";
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

  return (
    // The boot script may set data-theme before React loads, so the attribute can differ from the server's HTML.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${newsreader.variable} ${ibmPlexMono.variable}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="site-shell">
          <SiteHeader name={profile.name} links={profile.links} />
          {children}
          <SiteFooter links={profile.links} />
        </div>
      </body>
    </html>
  );
}
