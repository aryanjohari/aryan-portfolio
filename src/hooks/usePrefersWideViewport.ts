"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** True when viewport is at least `md` (768px). Server: false so WebGL is never assumed during SSR. */
export function usePrefersWideViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
