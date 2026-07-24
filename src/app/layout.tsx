import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";

import { MotionScaffold } from "@/components/motion/MotionScaffold";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Aryan Johari",
  description: "Curated portfolio of software projects and experiments.",
};

/**
 * When theatre motion would be skipped (reduced-motion only), mark <html> so
 * CSS hides #boot-cover immediately — without removing the node (avoids
 * hydration mismatch). Boot runs on all other viewports.
 */
const BOOT_COVER_GATE_SCRIPT = `(function(){try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.bootCoverSkip="1";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script
          id="boot-cover-gate"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: BOOT_COVER_GATE_SCRIPT }}
        />
        <div id="boot-cover" aria-hidden="true" />
        <MotionScaffold />
        <div className="site-shell">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
