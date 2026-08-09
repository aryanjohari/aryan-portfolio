"use client";

import {
  ABOUT_VOID_SCROLL_BLOCKS,
  VoidScrollDrama,
} from "@/components/VoidScrollDrama";

/**
 * About continuous-scroll block fades — thin wrapper over shared VoidScrollDrama.
 * Edge dissolve stays CSS-only on `[data-void-scroll].about-page`.
 */
export function AboutScrollDrama() {
  return <VoidScrollDrama blocks={ABOUT_VOID_SCROLL_BLOCKS} />;
}
