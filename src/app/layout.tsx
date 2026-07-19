import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

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

/** Inline: drop #boot-cover ASAP when enhanced motion gate would fail. */
const BOOT_COVER_GATE_SCRIPT = `(function(){try{var el=document.getElementById("boot-cover");if(!el)return;var m=window.matchMedia;if(!(m("(min-width: 1024px)").matches&&m("(pointer: fine)").matches&&!m("(prefers-reduced-motion: reduce)").matches))el.remove();}catch(e){}})();`;

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
        <div id="boot-cover" aria-hidden="true" />
        <script
          dangerouslySetInnerHTML={{ __html: BOOT_COVER_GATE_SCRIPT }}
        />
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
