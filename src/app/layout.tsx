import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getProfile } from "@/lib/profile";

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
    <html lang="en">
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
