"use client";

import dynamic from "next/dynamic";

const Atmosphere = dynamic(
  () => import("./Atmosphere").then((m) => m.Atmosphere),
  { ssr: false },
);

const BootOverlay = dynamic(
  () => import("./BootOverlay").then((m) => m.BootOverlay),
  { ssr: false },
);

/**
 * Client-only motion layer for the site shell.
 * Atmosphere sits behind content; BootOverlay briefly covers then unmounts.
 */
export function MotionScaffold() {
  return (
    <>
      <Atmosphere />
      <BootOverlay />
    </>
  );
}
