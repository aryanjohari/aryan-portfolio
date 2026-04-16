import { LinearFilter, SRGBColorSpace, Texture, TextureLoader } from "three";

import type { InlineAsset, SynthPreset } from "./types";

function applyUploadTextureSettings(t: Texture) {
  t.colorSpace = SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
}

function decodeBase64ToObjectUrl(asset: InlineAsset): string {
  const binary = atob(asset.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: asset.mime || "image/png" });
  return URL.createObjectURL(blob);
}

export type HydratedSynthPreset = {
  preset: SynthPreset;
  backgroundTexture: Texture;
  decalTexture: Texture | null;
};

const loader = new TextureLoader();

/**
 * Loads background (required if present) and optional decal from preset inline assets.
 * Caller must dispose textures when unmounting.
 */
export async function hydrateSynthPreset(
  preset: SynthPreset,
): Promise<HydratedSynthPreset> {
  const bg = preset.assets.background;
  if (!bg?.dataBase64) {
    throw new Error("hydrateSynthPreset: missing assets.background with dataBase64");
  }

  const bgUrl = decodeBase64ToObjectUrl(bg);
  try {
    const backgroundTexture = await new Promise<Texture>((resolve, reject) => {
      loader.load(
        bgUrl,
        (tex) => {
          applyUploadTextureSettings(tex);
          resolve(tex);
        },
        undefined,
        reject,
      );
    });

    let decalTexture: Texture | null = null;
    const dec = preset.assets.decal;
    if (dec?.dataBase64) {
      const decalUrl = decodeBase64ToObjectUrl(dec);
      try {
        decalTexture = await new Promise<Texture>((resolve, reject) => {
          loader.load(
            decalUrl,
            (tex) => {
              applyUploadTextureSettings(tex);
              resolve(tex);
            },
            undefined,
            reject,
          );
        });
      } finally {
        URL.revokeObjectURL(decalUrl);
      }
    }

    return { preset, backgroundTexture, decalTexture };
  } finally {
    URL.revokeObjectURL(bgUrl);
  }
}

export function disposeHydratedTextures(h: HydratedSynthPreset) {
  h.backgroundTexture.dispose();
  h.decalTexture?.dispose();
}
