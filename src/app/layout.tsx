import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Serif } from "next/font/google";

import { SmoothScrollProvider } from "@/components/animations/SmoothScrollProvider";
import { getSiteCssVariables } from "@/lib/site-css-vars";
import { siteConfig } from "../../site.config";

import "./globals.css";

const fontHeading = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-heading-stack",
  weight: "400",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: siteConfig.authorName,
  description: `${siteConfig.authorName} — developer portfolio`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontHeading.variable} ${fontMono.variable} h-full`}
      style={getSiteCssVariables()}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
