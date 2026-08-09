"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";

export type VoidNavigate = (href: string) => Promise<void>;

export const VoidNavigateContext = createContext<VoidNavigate | null>(null);

/** Morph-first in-app navigation (same curtain as chrome links). */
export function useVoidChromeNavigate(): VoidNavigate {
  const navigate = useContext(VoidNavigateContext);
  const router = useRouter();
  return (
    navigate ??
    (async (href: string) => {
      router.push(href);
    })
  );
}
