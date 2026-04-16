"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type BgJsonAsset = {
  mime?: unknown;
  dataBase64?: unknown;
};

type BgJsonShape = {
  assets?: {
    background?: BgJsonAsset | null;
  };
};

function readBackgroundDataUrl(json: BgJsonShape): string | null {
  const bg = json.assets?.background;
  if (!bg) return null;
  if (typeof bg.mime !== "string" || typeof bg.dataBase64 !== "string") {
    return null;
  }
  return `data:${bg.mime};base64,${bg.dataBase64}`;
}

export function MobileImageBackground() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/bg.json");
        if (!res.ok) return;
        const json = (await res.json()) as BgJsonShape;
        const dataUrl = readBackgroundDataUrl(json);
        if (!dataUrl || cancelled) return;

        const img = new window.Image();
        img.decoding = "async";
        img.src = dataUrl;
        await img.decode().catch(() => undefined);

        if (!cancelled) {
          setImageSrc(dataUrl);
        }
      } catch {
        // Keep the dark fallback if the mobile image cannot be read.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0c1528]" aria-hidden>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className="object-cover"
          fetchPriority="high"
        />
      ) : null}
    </div>
  );
}
