import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";

import { SiteFooter } from "@/components/SiteFooter";

import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Aryan Johari",
  description:
    "Graduate software engineer in Auckland. Systems, AI, and research. Open to junior / grad roles — no sponsorship required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} antialiased`}>
        <div className="site-shell">
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
