import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";
import { getProfile } from "@/lib/profile";

import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
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
        <div className="site-shell">
          {children}
          <SiteFooter links={profile.links} />
        </div>
      </body>
    </html>
  );
}
